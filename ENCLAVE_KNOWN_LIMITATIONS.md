# ENCLAVE — Known Limitations & Architectural Trade-offs
**Document Status:** Public Technical Disclosure  
**Classification:** Engineering & Security Transparency  
**Revision:** 2.1 (Post-Audit Remediation & Wire Integration)  

---

## 1. Overview & Transparency Mandate

In adherence to Rule 2.3 (*No Fake Security Indicators*), ENCLAVE does not make unrealistic claims such as "100% unhackable" or "military-grade security." Cryptography operates within specific mathematical boundaries, runtime constraints, and environmental assumptions.

This document transparently records the architectural constraints, environmental dependencies, and known edge-case boundaries of ENCLAVE v2.0/v2.1.

---

## 2. In-Browser Cryptographic Constraints

### 2.1 Deterministic Memory Zeroization in JavaScript
- **Limitation:** In compiled systems languages (C, Rust), cryptographic keys can be zeroized deterministically via `memset_s` or `sodium_memzero`. In JavaScript runtimes, primitive values (`string`, `number`) and certain immutable buffers are managed by browser garbage collection engines (V8, JavaScriptCore, SpiderMonkey).
- **Mitigation in ENCLAVE:** The protocol zeroes raw `Uint8Array` byte buffers (`buf.fill(0)`) immediately after single-use message key derivations, GCM operations, and media handling. However, transient string representations created during JSON serialization may remain in browser process memory until collected by the engine's garbage collector.

### 2.2 Endpoint Compromise
- **Limitation:** End-to-end encryption guarantees confidentiality in transit and against relay eavesdropping. It cannot protect a user whose local device is compromised by:
  - Kernel-level rootkits or keyloggers.
  - Malicious browser extensions with `<all_urls>` permissions that inspect the DOM.
  - Physical screen recording or shoulder-surfing.
- **Mitigation in ENCLAVE:** The application encourages running in private/incognito windows without third-party extensions enabled and enforces strict Content Security Policies (CSP).

### 2.3 WebCrypto Compatibility
- **Limitation:** ENCLAVE strictly requires a modern browser supporting native `SubtleCrypto` with Ed25519 (RFC 8032), X25519 (RFC 7748), and AES-GCM. Legacy browsers (e.g. Internet Explorer, pre-2023 embedded webviews) are unsupported.
- **Fail-Closed Behavior:** Rather than silently downgrading to insecure software cryptography, ENCLAVE fails closed and informs the user that a modern secure browser is required.

### 2.4 Pairwise Double Ratchet Scaling & Skipped Keys Threshold
- **Limitation:** In multi-participant rooms, Double Ratchet operates via pairwise ratchet sessions between each participant pair. Emitting a broadcast packet encrypts payloads pairwise ($O(N)$ CPU cost).
- **Practical Bounds:** Optimal for ephemeral chambers of 2 to 6 participants. Larger group scaling is slated for Messaging Layer Security (MLS / RFC 9420) TreeKEM in future roadmap iterations.
- **Skipped-Keys Bound:** To defend against memory-exhaustion denial-of-service attacks from malicious out-of-order packets, the skipped message key cache is strictly capped at 100 keys per session. Messages delayed by more than 100 ratchet steps are dropped.

---

## 3. Media & View-Once Boundaries

### 3.1 Single-Use Server Erasure vs. Client Display
- **Guaranteed Invariant:** View-once media is atomically delivered and obliterated from server storage in a single Redis Lua transaction (`GET + DEL + SREM`). Once retrieved by the authorized client, the server retains zero bytes and cannot serve the media again. The server never has access to plaintext media or its decryption keys.
- **Client-Side Physical Boundary:** In adherence to security transparency, ENCLAVE explicitly does not claim that server-side deletion prevents a recipient from:
  - Capturing the screen using operating system screenshot utilities or video capture tools.
  - Photographing the physical monitor or screen with an external camera or smartphone.
  - Dumping volatile browser GPU buffers on rooted or developer-unlocked machines.
- **Advisory:** Users must exercise judgment regarding the trustworthiness of participants to whom sensitive visual information is displayed.

---

## 4. Open-Room Secret (`#k=`) & Tab Storage Boundaries

### 4.1 Tab-Scoped Session Storage Lifecycle
- **Implementation:** For link-access rooms (`without_pass`), the high-entropy CSPRNG secret is transmitted in the URL fragment (`#k=<secret>`). Upon mount, the client stores this secret in `sessionStorage` keyed by `canonicalRoomId` and scrubs the fragment from the address bar via `history.replaceState`.
- **Tab Boundaries:**
  - **Page Refresh:** Refreshing the tab preserves access because `sessionStorage` persists for that tab's lifetime.
  - **Tab Closure:** Closing the tab terminates the session and destroys the cached key.
  - **Opening in New Tab:** Opening the scrubbed URL (`https://enclave.vercel.app/r/<roomId>`) in a separate tab or new browser window will fail to decrypt unless the complete invitation link with `#k=` is used.
  - **Private Browsing / Incognito:** When private browsing restricts or clears storage, tab closures immediately purge all cryptographic artifacts.

---

## 5. Network & WebRTC Peer-to-Peer Constraints

### 5.1 NAT Traversal & Enterprise Firewalls
- **Limitation:** WebRTC peer-to-peer connections rely on Interactive Connectivity Establishment (ICE). In symmetric NAT environments or behind restrictive corporate firewalls, STUN candidate discovery alone may fail to establish a direct P2P mesh.
- **Mitigation:** ENCLAVE includes configurable TURN relay server parameters (`/api/rooms/[roomId]/turn`). When configured, media relays through an encrypted TURN relay without sacrificing DTLS-SRTP end-to-end confidentiality.

### 5.2 Peer Mesh Scalability ($O(N^2)$ Bandwidth)
- **Limitation:** ENCLAVE employs a decentralized WebRTC peer mesh topology for voice and video calling. In a mesh network, every participant sends an independent upstream media feed to every other participant.
- **Practical Bounds:**
  - Optimal performance: 2 to 4 simultaneous participants.
  - Degraded performance: 5 to 6 participants on consumer broadband.
  - Scaling beyond 6 participants requires a Selective Forwarding Unit (SFU) with Messaging Layer Security (MLS) / TreeKEM, which is slated for future roadmap releases.

---

## 6. Relay & Storage Constraints

### 6.1 In-Memory Volatile Retention
- **Limitation:** Because ENCLAVE writes zero message transcripts or decryption keys to persistent disks or databases:
  - If all participants close their browsers or lose connection, the room dissolves permanently.
  - Messages cannot be restored after dissolution.
  - If a device crashes before a disappearing message timer fires, unread in-memory packets are lost.
- **Design Intent:** This is an intentional security design choice, not a defect. Zero retention guarantees that no historical data exists to be subpoenaed or breached.

---

## 7. Future Roadmap & Enhancements

1. **Messaging Layer Security (MLS) / RFC 9420:** Transitioning multi-party rooms from pairwise ratchets to MLS TreeKEM for $O(\log N)$ scalability.
2. **Selective Forwarding Unit (SFU) with End-to-End Encryption:** Scalable group calling with blind media routing via WebRTC Insertable Streams.
3. **Hardware-Backed Device Enclaves:** Native mobile client wrappers leveraging Apple Secure Enclave and Android StrongBox for non-exportable hardware identity keys.
