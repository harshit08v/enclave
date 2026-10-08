# ENCLAVE — Comprehensive Security Audit (V1 Pre-Hardening)

**Audit Date**: 2026-10-04  
**Auditor**: ENCLAVE Application Security & Cryptography Team  
**Scope**: Full repository audit spanning `packages/crypto/`, `packages/protocol/`, `src/lib/`, `src/app/`, API routes, transport relays, lifecycle state machine, key lifecycles, and documentation.

---

## Executive Summary of Audit Findings

The initial prototype implementation established the core UX, 3D architectural journey, and WebCrypto foundations. However, a rigorous adversarial review identified several critical, high, medium, and low security weaknesses across the cryptographic hierarchy, randomness generation, secret storage, replay vulnerability, and lifecycle state concurrency.

| Severity | Count | Primary Impact Areas |
| :--- | :--- | :--- |
| **CRITICAL** | 4 | Insecure KDF / Missing Key Wrapping Hierarchy, Lack of Forward Secrecy, Secret Pass Leaked to `sessionStorage`, `Math.random()` in Cryptographic Fallbacks |
| **HIGH** | 5 | Missing Authenticated Associated Data (AAD) in AES-GCM, Absence of Message Replay Protection & Sequence Counters, In-Memory Lifecycle Race Conditions (Simultaneous Departures), Non-Constant-Time Server Auth Verification, Missing Rate Limiting on Pass Guessing |
| **MEDIUM** | 4 | Client-Only Mock Authentication without Server-Side Password Hashing, Ephemeral Key Agreement Not Bound to Ephemeral DH Exchange, Potential Metadata Leakage in Console Logging, Lack of Content Security Policy (CSP) Headers |
| **LOW** | 3 | Incomplete Error Boundary Sanitization, Stale Presence Heartbeat Skew Threshold, Web Worker / Memory Unpinning Limitations |
| **INFORMATIONAL** | 2 | Documentation Discrepancies (PBKDF2 documented while Argon2id promised), Browser Memory Wiping Limitations in V8 Runtime |

---

## Detailed Findings & Remediation Specifications

### Finding 1: Insecure KDF & Direct Message Key Derivation [CRITICAL]
- **Vulnerability**: Passphrase derivation relied on standard PBKDF2-SHA256 rather than memory-hard Argon2id, and the access pass directly derived the AES-256-GCM message encryption key without a layered key hierarchy or independent room secret.
- **Affected Component**: `packages/crypto/index.ts`, `deriveRoomKeys()`.
- **Attack Scenario**: An adversary capturing network ciphertexts or attempting offline brute-force attacks against low-entropy human passphrases could leverage GPU/ASIC acceleration against PBKDF2. Furthermore, anyone possessing the access pass immediately obtains the direct message decryption key for all packets.
- **Security Impact**: Offline passphrase recovery vulnerability; violation of the required key hierarchy ($\text{Pass} \to \text{Argon2id} \to \text{KWK} \to \text{Wrapped Master Secret} \to \text{Ephemeral Session Keys}$).
- **Current Behavior**: `deriveRoomKeys` computes 512 bits via PBKDF2 (100k rounds) and splits bits into Auth Commitment and AES Key.
- **Required Remediation**: Implement Argon2id ($m=64\text{MB}, t=3, p=4$) via WebAssembly (`hash-wasm`). Introduce a 256-bit CSPRNG Room Master Secret wrapped by the Argon2id Key-Wrapping-Key (`KWK`), from which directional ephemeral session keys are derived via HKDF domain separation.
- **Verification Test**: Crypto test suite validating Argon2id derivation determinism, domain separation, and key wrapping correctness.

---

### Finding 2: Lack of Forward Secrecy & Ratchet Architecture [CRITICAL]
- **Vulnerability**: The room used a single static AES-256-GCM key derived from the passphrase for all messages throughout the room's lifetime.
- **Affected Component**: `packages/crypto/index.ts`, `src/lib/roomRelay.ts`.
- **Attack Scenario**: If an adversary compromises a participant's endpoint memory at the end of a session, they can decrypt all prior messages recorded over the wire.
- **Security Impact**: Total loss of forward secrecy for the message stream.
- **Current Behavior**: The same AES CryptoKey was reused with fresh IVs across all messages.
- **Required Remediation**: Implement an Ephemeral Key Exchange & Ratchet Session hierarchy where participants derive ephemeral sender/receiver keychains via HKDF with directional domain separation (`ENCLAVE v1 | Session Key | Participant`), advancing message keys per packet.
- **Verification Test**: Test proving that past message keys cannot be derived from a compromised ratchet state.

---

### Finding 3: Access Pass Secret Leaked to Browser `sessionStorage` [CRITICAL]
- **Vulnerability**: In `src/app/app/new/page.tsx` line 123, the room creator's secret passphrase was stored in `sessionStorage` (`sessionStorage.setItem('enclave_pass_${roomId}', passphrase)`).
- **Affected Component**: `src/app/app/new/page.tsx`, `src/app/r/[roomId]/page.tsx`.
- **Attack Scenario**: Any malicious browser extension, XSS vulnerability, or forensic analysis of the browser's persistent storage files on disk can extract the access pass.
- **Security Impact**: Direct compromise of out-of-band secret isolation; violation of zero-storage guarantees.
- **Current Behavior**: The pass is written to `sessionStorage` to allow auto-entry for the creator.
- **Required Remediation**: Completely purge `sessionStorage` storage for passphrases. Pass credentials strictly in transient React memory state / window variable with immediate cleanup, requiring manual entry or explicit in-memory handoff.
- **Verification Test**: Automated inspection of `sessionStorage`, `localStorage`, and `IndexedDB` asserting zero passphrases exist.

---

### Finding 4: Insecure PRNG Fallback (`Math.random()`) [CRITICAL]
- **Vulnerability**: `packages/crypto/index.ts` line 41, `src/lib/roomRelay.ts` line 177, `src/lib/authStore.ts` line 44, `signup/page.tsx`, and `login/page.tsx` used `Math.random()` for Diceware entropy, packet IDs, and user IDs.
- **Affected Component**: `packages/crypto/index.ts`, `src/lib/roomRelay.ts`, `src/lib/authStore.ts`.
- **Attack Scenario**: An attacker observing generated room IDs or packet IDs can predict PRNG internal state ($XorShift128+$ / $V8$), reconstructing future packet IDs, session IDs, and passphrases.
- **Security Impact**: Total compromise of cryptographic entropy and identifier unpredictability.
- **Current Behavior**: `Math.random()` used in multiple locations.
- **Required Remediation**: Replace all randomness with `crypto.getRandomValues()` (WebCrypto) and Node.js `crypto.randomBytes()`. Throw a hard exception if CSPRNG is unavailable.
- **Verification Test**: Static analysis grep verifying 0 instances of `Math.random()` in security code, plus entropy statistical checks.

---

### Finding 5: Missing Authenticated Associated Data (AAD) Binding in AES-GCM [HIGH]
- **Vulnerability**: `encryptMessage()` and `decryptMessage()` did not supply `additionalData` (AAD) to the WebCrypto `AES-GCM` parameters.
- **Affected Component**: `packages/crypto/index.ts`.
- **Attack Scenario**: A malicious relay server could intercept a valid ciphertext from Room A and replay/inject it into Room B, or swap the `senderId`, `packetId`, `sequence`, or `protocolVersion` in the cleartext envelope without failing the AES-GCM authentication tag.
- **Security Impact**: Cross-room packet injection, sender impersonation, and protocol version downgrade.
- **Current Behavior**: Only plaintext bytes were passed to `AES-GCM`; wire envelope metadata was unauthenticated.
- **Required Remediation**: Bind canonical binary AAD into every AES-GCM encryption/decryption:
  $$\text{AAD} = \text{CanonicalEncode}(\text{version}, \text{roomId}, \text{packetId}, \text{senderId}, \text{sequence}, \text{timestamp})$$
  Any modification to envelope metadata MUST immediately cause decryption failure.
- **Verification Test**: Adversarial test verifying that altering room ID, sender ID, or sequence in transit fails decryption.

---

### Finding 6: Absence of Replay Protection & Sequence Validation [HIGH]
- **Vulnerability**: Packets did not validate monotonic sequence numbers or strict timestamp expiration windows.
- **Affected Component**: `src/lib/roomRelay.ts`, `packages/protocol/index.ts`.
- **Attack Scenario**: An attacker recording encrypted WebSocket/HTTP packets over the network re-sends a previously recorded valid packet to the room. The recipient accepts and decrypts the duplicate message.
- **Security Impact**: Replay attack vulnerability, message duplication, and out-of-order execution.
- **Current Behavior**: Clients accepted any packet that successfully decrypted without verifying sequence numbers or replay cache.
- **Required Remediation**: Implement monotonic sequence counters, sliding replay window (tracking seen packet IDs), and a maximum timestamp skew threshold ($\Delta t \le 120\text{s}$).
- **Verification Test**: Adversarial test injecting duplicate and delayed packets, verifying automatic rejection.

---

### Finding 7: Race Conditions in Room Lifecycle & Simultaneous Leave [HIGH]
- **Vulnerability**: `serverRoomStore.ts` updated participant maps and triggered room destruction without atomic locking or state validation.
- **Affected Component**: `src/lib/serverRoomStore.ts`, `src/app/api/rooms/[roomId]/presence/route.ts`.
- **Attack Scenario**: If two participants depart simultaneously, or if a network reconnect races against a departure event, the room could enter `DESTROYED` while a socket is still accepted, or conversely fail to trigger destruction.
- **Security Impact**: Zombie rooms surviving past the last participant's departure, or race-condition message delivery to destroyed rooms.
- **Current Behavior**: Non-atomic state updates in JavaScript `Map`.
- **Required Remediation**: Implement atomic lifecycle state transitions with mutex/state guards, definitive destruction lockouts, and instant eviction of routing channels.
- **Verification Test**: Concurrency test executing simultaneous leave and join requests during destruction.

---

### Finding 8: Non-Constant-Time Server Auth Proof Verification [HIGH]
- **Vulnerability**: Server compared `keyBundle.authCommitment` using standard JavaScript string comparison (`===`), which is susceptible to timing side-channels.
- **Affected Component**: `src/app/api/rooms/[roomId]/route.ts`, `src/app/r/[roomId]/page.tsx`.
- **Attack Scenario**: An attacker measures microsecond response time differences to byte-by-byte reconstruct the valid `authCommitment` hash.
- **Security Impact**: Timing attack exposure against room authorization commitments.
- **Current Behavior**: Standard string equality comparison.
- **Required Remediation**: Implement constant-time comparison (`crypto.timingSafeEqual`) for all authentication commitment and token verifications.
- **Verification Test**: Unit test verifying constant-time comparison logic against mismatched lengths and contents.

---

### Finding 9: Missing Rate Limiting on Pass Guessing & Endpoint Abuse [HIGH]
- **Vulnerability**: The room join API and presence routes lacked rate limiting, allowing automated brute-force attempts against custom passphrases.
- **Affected Component**: `src/app/api/rooms/[roomId]/route.ts`, `src/app/api/rooms/route.ts`.
- **Attack Scenario**: A malicious bot scripts rapid automated dictionary attacks against `/api/rooms/[roomId]` or the WebSocket relay to guess the passphrase.
- **Security Impact**: Online brute-force attack vulnerability for weak custom passphrases.
- **Current Behavior**: No rate limits enforced on API routes.
- **Required Remediation**: Implement an in-memory sliding window rate limiter (max 5 failed pass attempts per IP/Room before exponential lockout) and global creation throttling.
- **Verification Test**: Adversarial test executing rapid failed guesses, confirming HTTP 429 / Lockout status.

---

### Finding 10: Client-Only Authentication without Server Password Hashing [MEDIUM]
- **Vulnerability**: Account signup and login stored credentials client-side without server-side PBKDF2/Argon2 password hashing or cryptographically signed session tokens.
- **Affected Component**: `src/app/signup/page.tsx`, `src/app/login/page.tsx`, `src/lib/authStore.ts`.
- **Attack Scenario**: An attacker accessing the client device can inspect stored user session details or forge account identifiers.
- **Security Impact**: Weak account authentication boundaries.
- **Current Behavior**: Mock client-side storage.
- **Required Remediation**: Implement secure password hashing (PBKDF2-SHA256 600,000 rounds / Argon2id) and cryptographically secure random session tokens (`CSPRNG 256-bit`).
- **Verification Test**: Unit tests verifying secure password hashing and token generation.

---

### Finding 11: Ephemeral Key Exchange Missing Protocol Domain Separation [MEDIUM]
- **Vulnerability**: Sub-key derivation lacked strict domain separation tags, risking key reuse collisions if key types expand.
- **Affected Component**: `packages/crypto/index.ts`.
- **Attack Scenario**: Key material derived for authorization proof could theoretically overlap with encryption keys.
- **Security Impact**: Cryptographic key misuse and violation of NIST SP 800-108 key separation standards.
- **Current Behavior**: Ad-hoc slice offsets.
- **Required Remediation**: Implement HKDF-Expand with distinct domain separation info strings:
  - `"ENCLAVE v1 | Auth Proof"`
  - `"ENCLAVE v1 | Key Wrapping Key"`
  - `"ENCLAVE v1 | Session Key | Alice"`
  - `"ENCLAVE v1 | Session Key | Bob"`
- **Verification Test**: Test verifying that different domain tags produce orthogonal, uncorrelated keys from the same master secret.

---

### Finding 12: Potential Metadata / Error Trace Leakage in Logging [MEDIUM]
- **Vulnerability**: Catch blocks in `roomRelay.ts` and API handlers used `console.error` that could output internal state objects or raw errors.
- **Affected Component**: `src/lib/roomRelay.ts`, `src/app/api/rooms/route.ts`.
- **Attack Scenario**: Log monitoring systems or developer consoles capture operational errors that expose internal packet IDs or user names.
- **Security Impact**: Privacy leakage in centralized log aggregators.
- **Current Behavior**: Verbose `console.error` logs.
- **Required Remediation**: Implement a sanitized security logger that scrubs sensitive identifiers and outputs only high-level operational codes.
- **Verification Test**: Log audit test verifying that no passphrases, ciphertexts, or private keys are ever logged.

---

### Finding 13: Missing Content Security Policy (CSP) & Security Headers [MEDIUM]
- **Vulnerability**: Next.js HTTP response headers lacked strict CSP, HSTS, and X-Content-Type-Options.
- **Affected Component**: `next.config.ts`, `src/app/layout.tsx`.
- **Attack Scenario**: An attacker injecting inline scripts or exploiting third-party asset loading could execute XSS attacks.
- **Security Impact**: XSS and clickjacking exposure.
- **Current Behavior**: Default Next.js headers.
- **Required Remediation**: Configure strict HTTP security headers in `next.config.ts`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- **Verification Test**: Automated header inspection test.

---

### Finding 14: Incomplete Memory Buffer Zeroization in V8 Engine [LOW]
- **Vulnerability**: While `zeroizeBuffer` overwrote `Uint8Array` memory, JavaScript garbage collection in V8 does not guarantee immediate physical RAM clearing of immutable string primitives.
- **Affected Component**: `packages/crypto/index.ts`.
- **Attack Scenario**: An attacker with root OS memory dumping capabilities extracts transient strings from process heap dumps after room destruction.
- **Security Impact**: Endpoint memory residue on compromised machines.
- **Current Behavior**: Buffers are zeroed, but JS strings cannot be manually zeroed in V8.
- **Required Remediation**: Minimize string conversions by working with raw `Uint8Array` buffers directly for all intermediate keys and secrets. Document the honest limitation of V8 garbage collection in `SECURITY_ASSUMPTIONS.md`.
- **Verification Test**: Documentation verification and buffer-oriented crypto refactoring.

---

### Finding 15: Stale Presence Heartbeat Timeout Invariant [LOW]
- **Vulnerability**: Heartbeat intervals (10s) had a loose server timeout threshold (60s), allowing stale zombie connections to delay room destruction.
- **Affected Component**: `src/lib/serverRoomStore.ts`, `src/lib/roomRelay.ts`.
- **Attack Scenario**: A participant closes their laptop lid abruptly without sending an explicit `presence_leave` packet; the room lingers for up to 60 seconds before destruction.
- **Security Impact**: Prolonged window of room existence after unexpected client disconnects.
- **Current Behavior**: 60-second inactivity eviction.
- **Required Remediation**: Tighten presence heartbeat window: 10-second client ping, 25-second server eviction threshold.
- **Verification Test**: Presence timeout test verifying automatic room destruction 25s after connection loss.

---

## Remediation Roadmap & Execution Matrix

```
[Phase 1: Cryptographic Engine & Key Hierarchy]
 ├── Install & Integrate hash-wasm Argon2id (m=64MB, t=3, p=4)
 ├── Implement 256-bit CSPRNG Room Master Secret & KWK Wrapping
 ├── Implement Directional Ephemeral Session Key Derivation with HKDF
 ├── Implement Canonical Authenticated Associated Data (AAD) for AES-256-GCM
 └── Eliminate ALL Math.random() with WebCrypto CSPRNG

[Phase 2: Protocol, Replay Protection & Secret Isolation]
 ├── Add Monotonic Sequence Numbers, Timestamp Windows & Replay Cache
 ├── Eliminate sessionStorage passphrase persistence in app/new & r/[roomId]
 ├── Implement Constant-Time Timing-Safe Comparison for Auth Tokens
 ├── Enforce Thread-Safe State Machine & Rejection of Destroyed/Destroying Rooms
 └── Implement In-Memory Rate Limiting for Join & Creation Endpoints

[Phase 3: Security Headers, Logging & Documentation]
 ├── Add Strict CSP & Security Headers to next.config.ts
 ├── Scrub all logging to enforce zero secret exposure
 ├── Update THREAT_MODEL.md, SECURITY_MODEL.md, PROTOCOL.md, KEY_LIFECYCLE.md
 └── Create SECURITY_ASSUMPTIONS.md & INCIDENT_RESPONSE.md

[Phase 4: Automated Test Suite & Adversarial Verification]
 ├── Build Comprehensive Crypto Unit Tests (Argon2id, AES-GCM+AAD, Key Separation)
 ├── Build Protocol & Replay Attack Prevention Tests
 ├── Build Lifecycle Concurrency & Simultaneous Departure Tests
 ├── Build End-to-End Adversarial Regression Tests
 └── Execute Complete Browser Subagent Journey
```
