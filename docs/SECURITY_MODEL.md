# ENCLAVE Security Model — Hardened V1

## 1. Cryptographic Architecture & Primitives
ENCLAVE relies exclusively on audited, standard cryptographic primitives executed via the W3C Web Cryptography API (`crypto.subtle`) and memory-hard Argon2id WebAssembly. Custom ciphers and unauthenticated modes are strictly prohibited.

```
+----------------------------------------------------------------------------------------------------+
|                                           ENCLAVE CLIENT                                           |
|                                                                                                    |
|  [ Out-of-Band Access Pass ]                                                                       |
|             |                                                                                      |
|             v (Salt: 16-byte CSPRNG)                                                               |
|  [ Memory-Hard Argon2id ] (m=64MB, t=3, p=4, or PBKDF2-600k fallback)                              |
|             |                                                                                      |
|             v                                                                                      |
|  [ Pass-Derived Key (PDK) ] (256 bits)                                                             |
|             |                                                                                      |
|             +---------------------------------------+---------------------------------------+      |
|             | (HKDF-Expand: "ENCLAVE v1 | Auth Token")| (HKDF-Expand: "ENCLAVE v1 | KWK")   |      |
|             v                                       v                                       |      |
|  [ SHA-256 Auth Commitment ]            [ Key Wrapping Key (KWK) ]                          |      |
|             | (Transmitted to Server)               | (AES-256-GCM)                                 |      |
|             |                                       v                                       |      |
|             |                         [ Unwrap / Wrap Room Secret ]                         |      |
|             |                                       |                                       |      |
|             |                                       v                                       |      |
|             |                          [ Room Master Secret (RMS) ] (256-bit CSPRNG)        |      |
|             |                                       |                                       |      |
|             |                                       v (HKDF: "ENCLAVE v1 | Session Key | ID")|      |
|             |                         [ Directional Ephemeral Session Key ]                 |      |
|             |                                       |                                       |      |
|             |                        +--------------+--------------+                        |      |
|             |                        | (AES-256-GCM + Canonical AAD)|                        |      |
|             |                        v                             v                        |      |
|             |                  [ Encrypt (IV) ]              [ Decrypt ]                    |      |
+-------------|------------------------|-----------------------------|------------------------+      |
              |                        |                             ^                               |
              v                        v                             |                               |
      +--------------------------------------------------------------------------------------+       |
      |                                    ENCLAVE RELAY                                     |       |
      |                      (Zero-Knowledge Blind Courier & Lifecycle Enforcer)             |       |
      +--------------------------------------------------------------------------------------+       |
```

---

## 2. Key Derivation & Proof of Access
1. **Passphrase Generation**: The room creator generates a 128-bit high-entropy passphrase via 4-word Diceware or 16-character alphanumeric CSPRNG.
2. **Salt Generation**: A 16-byte CSPRNG salt: $S \leftarrow \text{CSPRNG}(16)$.
3. **Memory-Hard Pass Derivation**:
   $$\text{PDK} = \text{Argon2id}(\text{Passphrase}, S, \text{mem}=64\text{MB}, \text{iter}=3, \text{lanes}=4, \text{len}=32)$$
4. **Sub-Key Separation (HKDF)**:
   - **Auth Commitment Key**: One-way SHA-256 hash commitment to verify room entry eligibility without revealing the key wrapping or message encryption secrets:
     $$\text{AuthBits} = \text{HKDF-Expand}(\text{PDK}, \text{"ENCLAVE v1 \| Auth Token"}, 32)$$
     $$\text{AuthCommitment} = \text{SHA-256}(\text{AuthBits})$$
   - **Key Wrapping Key (KWK)**: AES-256-GCM key derived for wrapping the Room Master Secret:
     $$\text{KWK} = \text{HKDF-Expand}(\text{PDK}, \text{"ENCLAVE v1 \| Key Wrapping Key"}, 32)$$
5. **Room Master Secret (RMS)**: An independent 256-bit CSPRNG secret $\text{RMS} \leftarrow \text{CSPRNG}(32)$. The RMS is wrapped using $\text{KWK}$ under authenticated AES-256-GCM and stored on the server as public metadata (`wrappedSecretBundle`).
6. **Directional Ephemeral Session Keys**:
   $$\text{Key}_{\text{session}} = \text{HKDF-Expand}(\text{RMS}, \text{"ENCLAVE v1 \| Session Key \| " } \| \text{ParticipantId}, 32)$$

---

## 3. Authenticated Encryption Scheme
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode).
- **Key Length**: 256 bits.
- **Initialization Vector (IV)**: Fresh 96-bit (12-byte) CSPRNG nonce generated independently for every single message. Nonce reuse is mathematically prevented.
- **Authentication Tag**: 128-bit tag ensuring ciphertext authenticity.
- **Canonical Authenticated Associated Data (AAD)**: Every message binds protocol context to prevent packet cross-room injection or replay:
  $$\text{AAD} = \text{"ENCLAVE-v1|ROOM:"} \| \text{roomId} \| \text{"|PKT:"} \| \text{packetId} \| \text{"|SENDER:"} \| \text{senderId} \| \text{"|SEQ:"} \| \text{sequence} \| \text{"|TS:"} \| \text{timestamp}$$

---

## 4. No Plaintext Retention & Strict Isolation
- **URL Purity**: The URL contains strictly the random `RoomId` UUID. The Access Pass is NEVER appended as a path segment, query parameter, hash fragment, or HTTP header.
- **Zero Disk Persistence**: Access passes, PDK, KWK, RMS, and decrypted plaintext are stored strictly in transient JavaScript runtime memory. They are NEVER written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
- **Memory Zeroization**: Upon departure or room dissolution, sensitive buffers are overwritten with random noise and zeroized (`zeroizeBuffer`), WebCrypto key references are detached, and channels are closed.
