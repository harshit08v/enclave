# ENCLAVE Cryptographic Key Lifecycle — Hardened V1

## 1. Cryptographic Key Inventory

| Key Symbol | Key Name | Purpose | Origin / Generation | Lifetime | Storage Location | Transport Behavior | Destruction / Zeroization |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pass** | Room Access Pass | Human-shared credential for room entry | Diceware wordlist or alphanumeric CSPRNG | Temporary (creation to distribution) | Ephemeral RAM only (one-time transit) | Shared out-of-band by user (never in URL) | Zeroized on room entry; never stored |
| **Salt** | KDF Salt | Prevents rainbow tables and precomputation | 16-byte CSPRNG (`crypto.getRandomValues`) | Room lifetime | Public room metadata | Sent in plaintext in room metadata | Evicted upon room dissolution |
| **PDK** | Pass-Derived Key | Intermediate key for HKDF domain expansion | Argon2id ($m=64\text{MB}, t=3, p=4$) | Transient during derivation | Ephemeral RAM | Never transmitted | Overwritten via `zeroizeBuffer` immediately after HKDF |
| **Commit** | Auth Commitment | Proves pass knowledge without revealing keys | $\text{SHA-256}(\text{HKDF}(\text{PDK}, \text{"ENCLAVE v1 \| Auth Token"}))$ | Room lifetime | Public room metadata | Sent to server during room creation | Evicted upon room dissolution |
| **KWK** | Key Wrapping Key | Encrypts/decrypts the Room Master Secret (RMS) | $\text{HKDF}(\text{PDK}, \text{"ENCLAVE v1 \| Key Wrapping Key"})$ | Transient during entry | Ephemeral WebCrypto object | Never transmitted | Detached from JS runtime on unwrap |
| **RMS** | Room Master Secret | Root 256-bit room secret for session keys | 32-byte CSPRNG (`crypto.getRandomValues`) | Active session duration | Ephemeral RAM in `EnclaveRoomSession` | Transmitted only as AES-GCM ciphertext wrapped under KWK | Overwritten via `zeroizeBuffer` on leave/destroy |
| **$K_{\text{session}}$** | Ephemeral Session Key | Directional AES-256-GCM message encryption/decryption | $\text{HKDF}(\text{RMS}, \text{"ENCLAVE v1 \| Session Key \| "} \| \text{ID})$ | Active session duration | Ephemeral WebCrypto `CryptoKey` | Never transmitted | Detached and dereferenced on exit |
| **Nonce (IV)** | Message Nonce | 96-bit unique IV for AES-GCM encryption | 12-byte CSPRNG fresh per packet | Single packet encryption | Prepend to wire packet payload | Sent in clear in wire envelope | Discarded after decryption |

---

## 2. Key Derivation & Wrapping Sequence

```
1. Passphrase Entry (Out-of-band)
       │
       ▼ Salt (16 bytes CSPRNG)
2. Argon2id (m=64MB, t=3, p=4) ──────────────────────> PDK (256-bit)
                                                           │
       ┌───────────────────────────────────────────────────┴───────────────────────────────────────────────────┐
       ▼ HKDF ("ENCLAVE v1 | Auth Token")                                                                      ▼ HKDF ("ENCLAVE v1 | Key Wrapping Key")
   AuthBits (256-bit)                                                                                      Key Wrapping Key (KWK)
       │                                                                                                       │
       ▼ SHA-256                                                                                               ▼ AES-256-GCM Wrap
   Auth Commitment (Sent to Server)                                                        RMS (256-bit CSPRNG) ────────> Wrapped Bundle (Sent to Server)
                                                                                                   │
                                                                                                   ▼ HKDF ("ENCLAVE v1 | Session Key | ID")
                                                                                           Ephemeral Directional Session Keys
                                                                                                   │
                                                                                                   ▼ AES-256-GCM + Canonical AAD
                                                                                           Authenticated Encrypted Message Packets
```

---

## 3. Secure Buffer Zeroization Protocol

To prevent key material lingering in browser memory after a room is dissolved:

```typescript
export function zeroizeBuffer(buffer: Uint8Array): void {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(buffer);
  }
  buffer.fill(0);
}
```

### Destruction Lifecycle:
1. `leaveRoom()` or `forceDestroy()` is invoked.
2. `roomMasterSecret` is filled with CSPRNG noise, then zeroes.
3. `CryptoKey` references are set to `null`.
4. Receiver key maps, sequence caches, and packet buffers are cleared (`.clear()`).
5. `BroadcastChannel` is closed.
6. Server marks room `DESTROYED` and purges active socket routing tables.
