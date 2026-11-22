# ENCLAVE — Cryptographic Protocol Verification Report

**Document Classification:** Formal Cryptographic Protocol Assessment  
**Reviewer:** Independent Cryptographic Protocol Reviewer & Principal Application Security Engineer  
**Specification Under Review:** `ENCLAVE_CRYPTOGRAPHIC_PROTOCOL_SPEC.md` (v2.0)  
**Implementation Modules Inspected:**  
- `packages/crypto/index.ts`  
- `packages/crypto/doubleRatchet.ts`  
- `packages/crypto/subtleEngine.ts`  
- `packages/protocol/index.ts`  
- `src/lib/roomRelay.ts`  
- `src/lib/deviceIdentity.ts`  
- `src/lib/safetyFingerprint.ts`  
- `tests/doubleRatchetAndIdentity.test.ts`  
- `tests/prototype/verifyDoubleRatchet.test.ts`

---

## 1. Executive Summary

This cryptographic review performed an in-depth line-by-line inspection of the cryptographic primitives, key schedule, key agreement, symmetric ratchets, asymmetric signatures, and wire framing within ENCLAVE.

### Critical Verdict:
While the underlying primitives (WebCrypto AES-256-GCM, Argon2id, HKDF-SHA256, Ed25519, X25519) are properly implemented and mathematically sound within unit test prototypes, **the Signal Double Ratchet protocol is not actually utilized in the production application runtime**. The live application relies on a static directional key schedule derived from the Room Master Secret (RMS), offering no forward secrecy between messages in an active chamber.

---

## 2. Protocol Invariant Verification Matrix

| Protocol Component | Claimed Standard | Actual Implementation Status | Classification |
| :--- | :--- | :--- | :--- |
| **Passphrase KDF** | Argon2id ($m=32\,\text{MB}, t=3, p=1$) | Fully implemented in `packages/crypto/index.ts` via `hash-wasm` with 16-byte CSPRNG salt. Standalone ArrayBuffer allocation prevents WASM memory offset corruption. | **VERIFIED** |
| **Subkey Expansion** | HKDF-SHA256 (RFC 5869) | Implemented via WebCrypto Subtle. Uses domain separation strings: `"ENCLAVE v1 \| Auth Token"`, `"ENCLAVE v2 \| Relay Auth Key"`, `"ENCLAVE v1 \| Key Wrapping Key"`. | **VERIFIED** |
| **Room Master Secret (RMS)** | 256-bit CSPRNG AES-GCM Wrap | Generated via `crypto.getRandomValues(32)`, wrapped under Key Wrapping Key (KWK) with Canonical Wrap AAD (`"ENCLAVE v1 \| Room Master Secret Wrap"`). | **VERIFIED** |
| **Double Ratchet (Signal)** | Perrin & Marlinspike Spec | Implemented in `packages/crypto/doubleRatchet.ts` as an isolated prototype. **Completely disconnected from live messaging in `src/lib/roomRelay.ts`**. | **FAILED** |
| **DH Ratchet Advancement** | X25519 (RFC 7748) | Implemented in `doubleRatchet.ts` via Node.js `crypto.diffieHellman`. Not present in browser WebCrypto runtime messaging. | **FAILED (PROTOTYPE ONLY)** |
| **Symmetric Chain KDF** | HMAC-SHA256 ($0x01 / 0x02$) | Implemented in `doubleRatchet.ts` (`kdfCK`). Not used in `roomRelay.ts`. | **FAILED (PROTOTYPE ONLY)** |
| **Skipped Message Keys** | Bounded Map (Max 100) | Implemented in `doubleRatchet.ts:295` (`skipMessageKeys`). Not used in `roomRelay.ts`. | **FAILED (PROTOTYPE ONLY)** |
| **Device Identity Keys** | Ed25519 (RFC 8032) | Keypair generation and signing implemented in `src/lib/deviceIdentity.ts`, but module is **never imported by runtime app**. | **FAILED (ORPHANED)** |
| **Safety Numbers** | 60-digit Fingerprint | Live UI uses `src/lib/safetyFingerprint.ts` (derives from RMS + ephemeral participant IDs). Does not bind persistent device keys. | **VERIFIED WITH LIMITATIONS** |
| **Replay & Sequence Handling** | Wire Packet Monotonicity | Enforced in `src/lib/roomRelay.ts` via `seenSequences` Map and `seenPacketIds` Set. | **VERIFIED** |
| **Multi-Tab & Device Sync** | BroadcastChannel Sync | Implemented in `roomRelay.ts` via `BroadcastChannel` across browser tabs. Multi-device sync for same user not implemented. | **VERIFIED WITH LIMITATIONS** |
| **Group Messaging** | Sender Keys / Pairwise | Chamber acts as a multi-participant room using individual directional keys from RMS (`deriveEphemeralSessionKey`). Not Signal Sender Keys. | **VERIFIED WITH LIMITATIONS** |

---

## 3. Deep-Dive Cryptographic Analysis

### 3.1 Initial Key Agreement & Chamber Setup

#### Implementation:
Chamber establishment relies on a hybrid password-authenticated key exchange (PAKE-like) envelope:
1. **Passphrase / Fragment Secret:** An out-of-band passphrase or URL fragment `#k=<secret>` is provided to the client.
2. **Argon2id Derivation:**
   $$\text{PDK} \leftarrow \text{Argon2id}(\text{passphrase}, \text{salt}, m=32768, t=3, p=1)$$
3. **HKDF Subkey Derivation:**
   $$\text{KWK} \leftarrow \text{HKDF-Expand}(\text{PDK}, \text{"ENCLAVE v1 \| Key Wrapping Key"}, 32)$$
   $$\text{RelayAuthKey} \leftarrow \text{HKDF-Expand}(\text{PDK}, \text{"ENCLAVE v2 \| Relay Auth Key"}, 32)$$
   $$\text{AuthBits} \leftarrow \text{HKDF-Expand}(\text{PDK}, \text{"ENCLAVE v1 \| Auth Token"}, 32)$$
   $$\text{AuthCommitment} \leftarrow \text{SHA-256}(\text{AuthBits})$$
4. **RMS Wrapping:**
   $$\text{RMS} \leftarrow \text{CSPRNG}(32)$$
   $$C_{\text{wrap}}, T_{\text{wrap}} \leftarrow \text{AES-256-GCM-Encrypt}_{KWK}(RMS, \text{IV}_{\text{wrap}}, \text{AAD}_{\text{wrap}})$$

#### Verification Verdict: **VERIFIED**
- Salt generation is 16 bytes CSPRNG.
- Argon2id parameters match high-security recommendations ($32\,\text{MB}$ memory, $3$ iterations).
- AES-256-GCM tag verification throws natively upon an incorrect passphrase, preventing unauthorized unwrapping of $RMS$.
- Zero plaintext passphrases or $RMS$ bytes are transmitted to the server.

---

### 3.2 Runtime Messaging Engine vs. Signal Double Ratchet

#### Claimed Behavior:
Section 4 of `ENCLAVE_CRYPTOGRAPHIC_PROTOCOL_SPEC.md` specifies that every message uses a ratcheted Diffie-Hellman ephemeral keypair ($DH_A$) and symmetric chain advancement ($kdfCK$), signing the resulting ciphertext with an Ed25519 identity key ($IK_A$).

#### Actual Code Path (`src/lib/roomRelay.ts`):
When a participant joins a chamber, `initSessionKeys()` executes:
```typescript
// src/lib/roomRelay.ts:145-147
private async initSessionKeys() {
  if (!this.roomMasterSecret) return;
  this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
}
```
And to decrypt messages from peer $B$:
```typescript
// src/lib/roomRelay.ts:149-157
private async getReceiverKey(senderId: string): Promise<EnclaveCryptoKey | null> {
  if (!this.roomMasterSecret) return null;
  let key = this.receiverKeys.get(senderId);
  if (!key) {
    key = await deriveEphemeralSessionKey(this.roomMasterSecret, senderId);
    this.receiverKeys.set(senderId, key);
  }
  return key;
}
```
In `packages/crypto/index.ts`:
```typescript
// packages/crypto/index.ts:708-736
export async function deriveEphemeralSessionKey(
  roomMasterSecret: Uint8Array,
  participantId: string
): Promise<EnclaveCryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const rmsKeyMaterial = await subtle.importKey('raw', roomMasterSecret, 'HKDF', false, ['deriveKey']);
  const sessionInfo = enc.encode(`ENCLAVE v1 | Session Key | ${participantId}`);
  return await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: sessionInfo },
    rmsKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

#### Cryptographic Evaluation:
1. **Zero Ratcheting:** `this.senderKey` is static. It does not advance upon message transmission.
2. **Zero Forward Secrecy within Room:** Since every message sent by Alice uses the same AES-GCM key derived from $RMS$, compromise of $RMS$ or Alice's session key allows retrospective decryption of all past messages sent by Alice.
3. **Zero Post-Compromise Recovery:** There is no DH ratchet step to heal compromise after key leakage.
4. **No Asymmetric Device Signatures:** `WirePacket` lacks Ed25519 signatures. Sender authenticity relies entirely on knowledge of $RMS$ and directional AAD binding.
5. **Double Ratchet Module Status:** The file `packages/crypto/doubleRatchet.ts` contains a fully functional Node.js implementation of the Double Ratchet (tested in `tests/prototype/verifyDoubleRatchet.test.ts`), but it uses Node's `crypto` module (`crypto.generateKeyPairSync`, `crypto.diffieHellman`, `crypto.createCipheriv`), which is incompatible with browser WebCrypto without polyfills. It was never wired into the browser client.

---

### 3.3 Identity Verification & Safety Numbers

#### Claimed Behavior:
60-digit safety numbers derived from sorted Ed25519 identity public keys ($IK_A, IK_B$), adhering to Signal's contact verification standard.

#### Actual Code Path (`src/lib/safetyFingerprint.ts`):
```typescript
// src/lib/safetyFingerprint.ts:22-64
export async function deriveSafetyFingerprint(
  roomMasterSecret: Uint8Array,
  roomId: string,
  participantIds: string[]
): Promise<string> {
  const enc = new TextEncoder();
  const sortedIds = [...participantIds].sort().join(':');
  ...
  const info = enc.encode(`ENCLAVE v1 | Safety Fingerprint | ${roomId} | ${sortedIds}`);
  const derivedBits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode(`ENCLAVE_SALT:${roomId}`),
      info: info
    },
    rmsKeyMaterial,
    256
  );
  ...
}
```

#### Cryptographic Evaluation:
1. **No Identity Key Binding:** The fingerprint is computed from $RMS$, `roomId`, and `participantIds`. It does not verify long-term peer public keys.
2. **Instability Across Reconnects:** Because guest IDs are generated as `guest_<random>_<timestamp>`, any page refresh or reconnection changes `participantIds`, thereby altering the derived 60-digit safety number.
3. **Room Authentication, Not Peer Authentication:** The safety number effectively verifies that all participants possess the same $RMS$ and view the same participant roster. It does not protect against identity substitution if the room secret is compromised.

---

### 3.4 Canonical Additional Authenticated Data (AAD)

#### Implementation (`packages/crypto/index.ts:483`):
```typescript
export function createCanonicalAAD(
  version: number,
  roomId: string,
  packetId: string,
  senderId: string,
  sequence: number,
  timestamp: number
): Uint8Array {
  const aadString = `ENCLAVE-v${version}|ROOM:${roomId}|PKT:${packetId}|SENDER:${senderId}|SEQ:${sequence}|TS:${timestamp}`;
  return new TextEncoder().encode(aadString);
}
```

#### Verification Verdict: **VERIFIED**
- Binds version, room identifier, unique packet identifier, sender identifier, sequence counter, and timestamp into the AES-256-GCM authentication tag calculation.
- Defeats packet transplantation across rooms, sender impersonation, sequence manipulation, and timestamp tampering.
- Adversarial test suite (`tests/adversarial.test.ts` Attacks 2 & 3) proves that modifying any single AAD field causes `subtle.decrypt` to fail.

---

### 3.5 Ephemeral WebRTC Call Signaling Encryption

#### Implementation (`src/lib/roomRelay.ts:1103`):
```typescript
public async sendCallSignal(signal: CallSignalPayload): Promise<void> {
  const encryptedPayload = await encryptMessage(
    this.senderKey,
    JSON.stringify(signal),
    this.roomId,
    packetId,
    this.user.id,
    seq,
    now,
    1
  );
  const wirePacket: WirePacket = {
    version: 1,
    packetId,
    roomId: this.roomId,
    senderId: this.user.id,
    senderName: this.user.displayName,
    sequence: seq,
    timestamp: now,
    payload: encryptedPayload,
    type: 'call_signal'
  };
  ...
}
```

#### Verification Verdict: **VERIFIED**
- Full session signaling frames (including SDP offers, SDP answers, ICE candidate strings, and media mute states) are serialized and encrypted under the sender's directional AES-256-GCM key.
- The relay server receives only the `EncryptedPayload` (`ciphertext` and `iv`).
- Zero plaintext SDP or network candidate topologies leak to intermediate network hops.

---

## 4. Test Vector & Conformance Comparison

| Test Vector / Standard | Expected Result | Actual Result | Conformance |
| :--- | :--- | :--- | :--- |
| **RFC 5869 (HKDF-SHA256)** | Correct Extract-and-Expand PRK/OKM | Passes RFC 5869 test vectors via WebCrypto Subtle implementation | **CONFORMANT** |
| **RFC 8032 (Ed25519)** | Deterministic Edwards-curve signatures | Unit test passes (`tests/doubleRatchetAndIdentity.test.ts:38`), but not in app | **PROTOTYPE CONFORMANT ONLY** |
| **RFC 7748 (X25519)** | Diffie-Hellman shared secret derivation | Unit test passes (`tests/prototype/verifyDoubleRatchet.test.ts:40`), but not in app | **PROTOTYPE CONFORMANT ONLY** |
| **Signal Double Ratchet Spec** | KDF chain ratchet + DH ratchet healing | Passes in `tests/prototype/` across 7 tests; **absent in live app** | **NOT CONFORMANT IN RUNTIME** |
| **NIST SP 800-38D (AES-GCM)** | 128-bit tag validation with Canonical AAD | Tampered ciphertext/AAD reliably throws DOMException / error | **CONFORMANT** |

---

## 5. Cryptographic Remediation Roadmap

1. **Port Double Ratchet to WebCrypto:** Refactor `packages/crypto/doubleRatchet.ts` to utilize standard browser WebCrypto Subtle (`generateKey({ name: 'X25519' })`, `deriveBits`, and `Ed25519` via Subtle or an audited pure-JS library for legacy browser fallbacks).
2. **Wire DoubleRatchetSession into RoomSession:** Replace `this.senderKey` in `EnclaveRoomSession` with pairwise `DoubleRatchetSession` instances established during initial participant presence exchange.
3. **Upgrade WirePacket Framing:** Update `WirePacket` to transmit ratchet header fields:
   ```typescript
   export interface RatchetWireHeader {
     dhPub: string; // Hex ephemeral X25519 public key
     pn: number;    // Previous chain length
     n: number;     // Message sequence counter in current chain
   }
   ```
4. **Bind Device Identities to Safety Numbers:** Update `deriveSafetyFingerprint` to accept long-term Ed25519 public keys ($IK_A, IK_B$) instead of ephemeral room participant strings.
