# ENCLAVE Threat Model — Hardened V1

## 1. Introduction & Security Objectives
ENCLAVE is an ephemeral, end-to-end encrypted (E2EE) communication platform designed to provide private, temporary digital rooms. The core architectural philosophy is **Zero Long-Term Presence**: conversations exist solely during the active participation of authorized endpoints and are destroyed upon departure.

This threat model defines the system's security objectives, adversary models, trusted computing base (TCB), in-scope protections, cryptographic invariants, and explicit out-of-scope boundaries.

---

## 2. Core Security Objectives
1. **Confidentiality**: Plaintext messages, attachments, session keys, and access passes MUST never be accessible to any party other than the active authenticated participants in an Enclave chamber.
2. **Integrity & Authenticity**: Every message payload MUST be cryptographically authenticated with AES-256-GCM and bound to Canonical Authenticated Associated Data (AAD) to prevent tampering, forging, reordering, or context-shifting.
3. **Key Isolation & Hierarchy**: Access passes MUST NOT directly encrypt messages. Key material is derived through a formal hierarchy:
   $$\text{Access Pass} \xrightarrow{\text{Argon2id}} \text{PDK} \xrightarrow{\text{HKDF}} \text{KWK} + \text{Auth Commitment} \xrightarrow{\text{AES-GCM Wrap}} \text{Room Master Secret (RMS)} \xrightarrow{\text{HKDF}} \text{Directional Ephemeral Keys}$$
4. **Zero Server Knowledge**: The relay server acts strictly as an untrusted ciphertext forwarder. The server NEVER possesses plaintext messages, access passes, Key Wrapping Keys (KWK), or Room Master Secrets (RMS).
5. **Separation of Authentication & Locality**: The Room URL (`/r/[roomId]`) and the Access Pass (`[passphrase]`) MUST be strictly separated. Possession of a Room URL without the out-of-band Access Pass grants zero access to room state or ciphertexts.
6. **Definitive Ephemerality & Anti-Resurrection**: Upon the exit of the final participant, the room record, routing table, and in-transit buffers MUST be permanently obliterated. Resurrecting a destroyed chamber via stale credentials MUST be strictly rejected.

---

## 3. Adversary Models & Capabilities

| Adversary Profile | Description | Capabilities | ENCLAVE Mitigations |
| :--- | :--- | :--- | :--- |
| **Untrusted Server / Hostile Infrastructure** | Cloud host, malicious relay operator, or compromised backend database. | Intercept, log, replay, delay, or drop traffic passing through the relay server. | All message payloads are encrypted client-side with AES-256-GCM. Passphrases are never transmitted (one-way SHA-256 Auth Commitment). No plaintext is persisted. |
| **Network Eavesdropper (MITM)** | Adversary monitoring public Wi-Fi, DNS, or fiber taps. | View packet metadata, attempt TLS stripping, inspect URLs. | TLS 1.3 + Application-layer AES-256-GCM with Canonical AAD. Access pass is never in URL, query strings, headers, or referrers. |
| **Offline Brute-Force Attacker** | Adversary capturing public salt and auth commitment from server metadata. | Attempt dictionary/wordlist attacks against room access pass. | Memory-hard **Argon2id** ($m=64\text{MB}, t=3, p=4$) makes GPU/ASIC offline password cracking computationally infeasible. |
| **Online Brute-Force Attacker** | Adversary attempting repeated pass guesses against `/api/rooms/[roomId]`. | Rapidly send candidate auth tokens. | Server-side sliding-window rate limiting locks room query after 5 failed attempts per IP/Room. |
| **Replay & Forgery Attacker** | Adversary capturing legitimate ciphertext packets and resending or altering them. | Resend captured encrypted packets or modify headers. | Monotonic sequence counters, sliding-window deduplication, and Canonical AAD binding (`version|roomId|packetId|senderId|sequence|timestamp`) reject replayed or modified packets. |
| **Browser Storage Inspector** | Malicious extension, forensic analyst, or shared computer user. | Inspect `localStorage`, `sessionStorage`, cookies, and IndexedDB. | Access passes and Room Master Secrets are NEVER stored in `localStorage`, `sessionStorage`, or cookies. Secrets exist exclusively in transient RAM and are zeroized upon leaving. |
| **Malicious Co-Participant (Inside Adversary)** | Authorized participant invited to the room who acts maliciously. | View decrypted messages in real time, take screenshots, or record audio. | **Out of scope for cryptography**. Addressed via honest UX disclosure, ephemeral warnings, and manual room obliteration controls. |

---

## 4. Trusted Computing Base (TCB)
The TCB is strictly confined to:
- The local client device hardware, operating system, and browser engine executing Web Cryptography API (`crypto.subtle`) and WebAssembly.
- The user's secure distribution of their Access Pass over an independent out-of-band communication channel (e.g., Signal or in-person).

The relay server, API routes, database, WebSocket routers, and load balancers are explicitly **EXCLUDED** from the Trusted Computing Base.

---

## 5. Explicit Out-of-Scope Risks (Honest Security Boundary)
ENCLAVE does not make unrealistic or mathematically impossible claims. The following threats are explicitly outside the technical boundary:
1. **Compromised Endpoints**: Malware, rootkits, or memory dump tools on an endpoint device.
2. **Physical / Visual Eavesdropping**: Shoulder-surfing, external cameras, or hardware screen capture.
3. **Participant Co-Option**: An authorized participant intentionally photographing or transcribing messages.
4. **Coarse Traffic Analysis**: Global passive adversaries observing network connection durations and packet frequency.
