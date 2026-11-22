# ENCLAVE — Cryptographic Protocol Specification (v2.2)
**Document Status:** Final Cryptographic Protocol Specification  
**Classification:** Technical / Cryptographic Standard  
**Revision:** 2.2 (Phase 5 Live Double Ratchet & Identity Defense Runtime Integration)  
**Primary Authors:** ENCLAVE Cryptographic Protocol Architecture Team  

---

## 1. Scope & Security Objectives

ENCLAVE is an ephemeral, end-to-end encrypted messaging and real-time collaboration protocol engineered for high confidentiality, forward secrecy, post-compromise recovery, and zero server-side persistence.

### Primary Cryptographic Invariants
1. **Confidentiality:** The relay server, infrastructure providers, and network eavesdroppers have zero knowledge of plaintext messages, media, or signaling frames.
2. **Forward Secrecy (FS):** Compromise of a participant's long-term device key or current ratchet state cannot expose historical messages exchanged prior to compromise.
3. **Post-Compromise Security (PCS):** If an active ratchet state is temporarily leaked, the protocol self-heals after one bidirectional exchange, re-establishing secrecy against future eavesdropping.
4. **Authenticity & Integrity:** Every packet is cryptographically authenticated via AES-256-GCM authentication tags and Ed25519 asymmetric device signatures bound to Canonical Additional Authenticated Data (AAD).
5. **No Key Leakage on Server:** Public metadata endpoints disclose zero authorization secrets, encryption keys, or commitments.
6. **Zero Plaintext Storage for Media:** View-once and standard media are encrypted on the client before upload; view-once media is atomically delivered and purged from server state in a single operation.

---

## 2. Cryptographic Primitive Selections

| Primitive | Parameter / Standard | Purpose |
| :--- | :--- | :--- |
| **Argon2id** | $m=32\,\text{MB}$, $t=3$, $p=1$, 256-bit salt | Password-based key derivation resisting GPU/ASIC brute-force |
| **HKDF-SHA256** | RFC 5869 (HMAC-SHA256 Extract-and-Expand) | Domain-separated subkey expansion from master secrets |
| **AES-256-GCM** | NIST SP 800-38D (256-bit key, 96-bit IV, 128-bit tag) | Authenticated symmetric encryption with Canonical AAD |
| **Ed25519** | RFC 8032 (Edwards-curve Digital Signature) | Device identity keys and authoritative admin destruction proofs |
| **X25519** | RFC 7748 (Montgomery curve Diffie-Hellman) | Ephemeral Diffie-Hellman ratcheting for Double Ratchet |
| **SHA-512** | FIPS 180-4 | High-entropy digest for deterministic 60-digit Safety Numbers |
| **WebCrypto CSPRNG** | `crypto.getRandomValues()` | Generation of nonces, IVs, salts, and room secrets |

---

## 3. Key Hierarchy & Derivation Architecture

```
                    Passphrase or Room Secret (#k)
                                  │
                       Argon2id (Salt, m=32MB, t=3)
                                  │
                           Derived Seed
                                  │
                 HKDF-Extract (Salt, "ENCLAVE-v2-Seed")
                                  │
                             Master PRK
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
    HKDF-Expand              HKDF-Expand              HKDF-Expand
("Key Wrapping Key")      ("Relay Auth Key")       ("Double Ratchet Root")
         │                        │                        │
        KWK                  RelayAuthKey                 RootKey
         │                        │                        │
   AES-256-GCM Wrap        HMAC-SHA256 Token       Signal Double Ratchet
         │                        │                        │
  Wrapped RMS Bundle        Scoped Relay Auth       Per-Message Ephemeral Keys
```

### 3.1 Room Master Secret (RMS)
- The Room Master Secret ($RMS$) is a 256-bit cryptographically secure random value generated on the creator's device:
  $$RMS \leftarrow \text{CSPRNG}(256)$$
- $RMS$ is wrapped under $KWK$ using AES-256-GCM with Canonical AAD:
  $$\text{AAD}_{\text{wrap}} = \text{CanonicalWrapAAD}(v=2, \text{roomId}, \text{salt})$$
  $$C_{\text{wrap}}, T_{\text{wrap}} \leftarrow \text{AES-GCM-Encrypt}_{KWK}(RMS, \text{IV}_{\text{wrap}}, \text{AAD}_{\text{wrap}})$$
- The resulting `wrappedSecretBundle` is registered with the server at room creation. Any client possessing the valid passphrase or `#k` secret can unwrap $RMS$. If an invalid passphrase is supplied, AES-GCM tag verification throws an authentication failure natively in WebCrypto.

### 3.2 Relay Authorization Key & Scoped Tokens
- The `relayAuthKey` is derived via domain-separated HKDF:
  $$\text{relayAuthKey} \leftarrow \text{HKDF-Expand}(\text{PRK}, \text{"ENCLAVE v2 | Relay Auth Key | "} \parallel \text{roomId}, 32)$$
- Transmitted over TLS to the server store upon room creation. Held exclusively in private server state.
- Clients issue scoped authorization tokens conforming to:
  $$\text{Token} = \text{EnclaveToken}.\text{Base64Url}(\text{JSON}(payload)).\text{Hex}(\text{HMAC-SHA256}_{\text{relayAuthKey}}(\text{CanonicalString}))$$
  $$\text{CanonicalString} = \text{rid} \parallel \text{"|"}\parallel \text{pid} \parallel \text{"|"}\parallel \text{method} \parallel \text{"|"}\parallel \text{pathname} \parallel \text{"|"}\parallel \text{ts} \parallel \text{"|"}\parallel \text{nonce}$$
- In production, static credentials (`authCommitment`, `relayAuthKey`, `x-enclave-auth-commitment`) are completely rejected; only scoped tokens with atomic Redis nonce validation are accepted.

---

## 4. Signal Double Ratchet & WirePacket v2 Specification

### 4.1 WirePacket Framing (Version 2)
Every message, media caption, reaction, receipt, disappearing timer update, or WebRTC signaling frame emitted across the relay conforms to `WirePacket` version 2:

```typescript
export interface RatchetHeader {
  dhPub: string; // 32-byte hex-encoded X25519 public key
  pn: number;    // Previous sending chain length (uint32)
  n: number;     // Message sequence counter in current chain (uint32)
}

export interface WirePacket {
  version: 1 | 2;
  packetId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  sequence: number;
  timestamp: number;
  payload: EncryptedPayload;
  type: string;
  ratchetHeader?: RatchetHeader;
  senderIdentityKey?: string; // Hex-encoded Ed25519 public key
  signature?: string;         // Hex-encoded Ed25519 signature
}
```

### 4.2 Ed25519 Packet Signing & Verification Pipeline
Before emitting a packet to the blind relay, the client binds the packet envelope cryptographically:
$$\text{AAD}_{\text{envelope}} = \text{packetId} \parallel \text{":"} \parallel \text{roomId} \parallel \text{":"} \parallel \text{senderId} \parallel \text{":"} \parallel \text{sequence} \parallel \text{":"} \parallel \text{timestamp} \parallel \text{":"} \parallel \text{ciphertext}$$

1. **Signing:** The client computes:
   $$\Sigma \leftarrow \text{Ed25519-Sign}(IK_A.\text{priv}, \text{AAD}_{\text{envelope}})$$
   Attaches `senderIdentityKey = Hex(IK_A.pub)` and `signature = Hex}(\Sigma)`.
2. **Relay Transport:** Transmitted over TLS to the blind relay. The server cannot tamper with the payload without invalidating $\Sigma$.
3. **Verification on Ingestion:** The recipient executes:
   $$\text{Valid} \leftarrow \text{Ed25519-Verify}(\text{packet.senderIdentityKey}, \text{AAD}_{\text{envelope}}, \text{packet.signature})$$
   - If signature verification fails, the packet is instantly dropped.
   - If `packet.senderIdentityKey` does not match the stored authenticated key for `packet.senderId`, a security alert is triggered (`onIdentityAlert`) and the packet is quarantined.

### 4.3 Double Ratchet KDF & State
- **Header AAD Canonicalization:**
  $$\text{AAD}_{\text{header}} = \text{dhPub}[0\dots 31] \parallel \text{BigEndianUint32}(pn) \parallel \text{BigEndianUint32}(n) \quad (40\text{ bytes})$$
  Passed as `additionalData` into AES-256-GCM AEAD encryption and decryption.
- **Root KDF ($kdfRK$):**
  $$\text{PRK} \leftarrow \text{HMAC-SHA256}_{RK}(DH_{\text{out}})$$
  $$RK_{\text{next}} \leftarrow \text{HMAC-SHA256}_{\text{PRK}}(\text{"ENCLAVE-v2-DoubleRatchet-RootKDF"} \parallel 0x01)$$
  $$CK \leftarrow \text{HMAC-SHA256}_{\text{PRK}}(RK_{\text{next}} \parallel \text{"ENCLAVE-v2-DoubleRatchet-RootKDF"} \parallel 0x02)$$
- **Chain KDF ($kdfCK$):**
  $$MK \leftarrow \text{HMAC-SHA256}_{CK}(0x01)$$
  $$CK_{\text{next}} \leftarrow \text{HMAC-SHA256}_{CK}(0x02)$$
- **Replay & Skipped Keys:**
  - Retired DH public keys are recorded in `pastDHPublicKeys`. Any subsequent packet presenting a retired DH key is permanently dropped.
  - Consumed sequence counter check: in the active chain, packets with $n < \text{recvSequence}$ that are not in the skipped keys cache are rejected.
  - Skipped message keys are stored in an LRU buffer bounded at 100 entries.

### 4.4 Mid-Session Identity Substitution Defense & Packet Quarantine
To prevent silent Man-in-the-Middle (MITM) device key substitution:
1. **Quarantine:** Packets from unknown or replaced Ed25519 identity keys are routed into a quarantined memory buffer (`quarantinedPackets`) and blocked from decryption.
2. **Alerting:** An `IdentityAlert` event is dispatched with the previous key, replacement key, and calculated 60-digit safety number.
3. **User Action:**
   - **Reject:** Marks the key as blocked and permanently deletes all quarantined packets.
   - **Verify & Accept:** Records the new key as verified, resets the ratchet session to ensure fresh cryptographic state, and drains the quarantined packet queue through `handleIncomingPacket`.

---

## 5. View-Once Media Single-Use Delivery Protocol

View-once media requires strict zero-knowledge confidentiality and single-use delivery without client-side race conditions.

```
Recipient Client                         Relay / Storage API                        Redis Store
      │                                           │                                      │
      │  POST /api/rooms/[rid]/media/consume      │                                      │
      │  (EnclaveToken with method/path/nonce)    │                                      │
      ├──────────────────────────────────────────>│                                      │
      │                                           │  EVAL (Lua GET + DEL + SREM)         │
      │                                           ├─────────────────────────────────────>│
      │                                           │  Returns ciphertext (or nil)         │
      │                                           │<─────────────────────────────────────┤
      │  HTTP 200 OK                              │                                      │
      │  { success: true, media: { ciphertext } } │                                      │
      │<──────────────────────────────────────────┤                                      │
      │                                           │                                      │
      │  [In-Memory Decryption via AES-256-GCM]   │                                      │
      │  [Render in DOM; purge buffer on close]   │                                      │
      ▼                                           ▼                                      ▼
```

### Protocol Guarantees
1. **Atomic Retrieval & Erasure:** The Redis Lua script executes `GET`, `DEL`, and `SREM` atomically. Only the first valid request receives the ciphertext; subsequent or concurrent calls receive `nil` and return HTTP 404.
2. **Zero Server Knowledge:** Plaintext media is never uploaded. The server stores and deletes only blind ciphertext.
3. **No Intermediate Deletion Race:** Unlike two-step fetch-then-delete architectures, the consumer receives the ciphertext in the same atomic response that wipes it from storage.

---

## 6. Open-Room Secret (`#k=`) Persistence & Invitation Protocol

Link-access rooms operate without user-supplied passwords by generating high-entropy CSPRNG secrets.

### 6.1 Generation & URL Formatting
- The creator client generates a 256-bit random hex string:
  $$k \leftarrow \text{CSPRNG}(32)$$
- The invitation link is constructed with an RFC 3986 fragment:
  $$\text{https://enclave.vercel.app/r/}[roomId]\#k=[k]$$

### 6.2 Browser Address Bar Scrubbing & Session Storage
1. On component mount, the client extracts `$k$` from `window.location.hash`.
2. The client writes `$k$` into tab-isolated session storage:
   $$\text{sessionStorage.setItem}(\text{"enclave\_room\_pass\_"} \parallel \text{canonicalRoomId}, k)$$
3. The client immediately sanitizes the browser address bar:
   $$\text{window.history.replaceState}(null, \text{""}, \text{"/r/"} \parallel \text{canonicalRoomId})$$
4. On browser refresh in the same tab, the secret is recovered from `sessionStorage`, avoiding access loss.
5. In accordance with RFC 3986, the fragment `#k=` is never transmitted across the network in HTTP request headers.

---

## 7. Contact Identity & Safety Numbers

To detect Man-in-the-Middle (MITM) attacks and malicious relay servers, ENCLAVE derives deterministic, symmetric 60-digit Safety Numbers.

### Computation Algorithm
1. Retrieve local Ed25519 public key ($IK_A$) and peer Ed25519 public key ($IK_B$).
2. Sort keys lexicographically:
   $$K_{\text{sorted}} = \text{Sort}(\text{Hex}(IK_A), \text{Hex}(IK_B))$$
3. Compute SHA-512 digest:
   $$D \leftarrow \text{SHA-512}(K_{\text{sorted}}[0] \parallel \text{":"} \parallel K_{\text{sorted}}[1])$$
4. Extract 12 chunks of 4 bytes each, modulo $100{,}000$, formatted as 5-digit zero-padded numbers:
   $$\text{Block}_i = (D[4i \dots 4i+3] \pmod{100{,}000}).\text{padStart}(5, \text{'0'})$$
5. Format: `XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX XXXXX` (60 digits total).

---

## 8. WebRTC Signaling Cryptography

All WebRTC signaling frames (SDP Offer, SDP Answer, ICE Candidate, Ring, Decline, Hangup) are encrypted using AES-256-GCM.
- Plaintext field `callSignalData` has been completely removed from wire packets.
- Canonical Signaling AAD:
  $$\text{AAD}_{\text{signal}} = \text{"ENCLAVE_SIGNAL_v2|"}\parallel \text{roomId} \parallel \text{"|"}\parallel \text{senderId} \parallel \text{"|"}\parallel \text{signalType} \parallel \text{"|"}\parallel \text{timestamp}$$
- Tampered or replayed signaling packets fail GCM tag verification and are dropped before reaching `WebRTCManager`.

---

## 9. Threat Model & Security Boundaries

### In Scope
- **Untrusted Network:** TLS 1.3 termination, defense against eavesdropping and packet injection.
- **Untrusted / Compromised Relay Server:** Blind relay model ensures the server cannot read messages, forge relay tokens, or forge administrative destruction proofs.
- **Out-of-Band Channel Separation:** Knowing a room ID alone provides zero access to room keys.

### Out of Scope / Endpoint Assumptions
- **Endpoint Compromise:** Physical access or kernel-level keylogger on the user's device cannot be defeated by in-browser cryptography.
- **Browser Memory Scraping:** While ENCLAVE zeroes single-use message keys and scrubs URL fragments, JavaScript garbage collection does not provide deterministic C-style `memset_s` guarantees for all string objects.
