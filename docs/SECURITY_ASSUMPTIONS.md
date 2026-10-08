# ENCLAVE Security Assumptions & Environmental Prerequisites

## 1. Executive Overview
Every cryptographic security model rests upon a set of foundational assumptions about the environment, endpoint platforms, underlying hardware, and operational practices. This document enumerates the explicit security assumptions underpinning the ENCLAVE architecture.

---

## 2. Fundamental Cryptographic Assumptions

1. **Primitive Hardness**:
   - **AES-256**: We assume no feasible ciphertext-only, known-plaintext, or chosen-ciphertext attacks exist against 256-bit AES in Galois/Counter Mode (GCM) when nonces are unique.
   - **Argon2id**: We assume the memory-hard properties of Argon2id ($m=64\text{MB}, t=3, p=4$) provide adequate resistance against mass parallelized GPU/ASIC password cracking.
   - **SHA-256 & HKDF**: We assume collision resistance and pseudo-random function (PRF) security for SHA-256 and HKDF (RFC 5869).

2. **CSPRNG Unpredictability**:
   - We assume the runtime environment provides an uncompromised cryptographically secure pseudorandom number generator via `window.crypto.getRandomValues()` or `globalThis.crypto`.

---

## 3. Platform & Runtime Assumptions

1. **Browser Sandbox Integrity**:
   - We assume the client's web browser enforces strict origin isolation, process sandboxing, and memory safety preventing other tabs or extensions from reading ENCLAVE heap memory.
2. **WebAssembly & WebCrypto Correctness**:
   - We assume the browser's implementation of the W3C Web Cryptography API and WebAssembly runtime execute faithfully without unauthorized memory exposure or arithmetic corruption.
3. **Absence of Endpoint Malware**:
   - We assume the participant's physical device is free from rootkits, OS keyloggers, screen scrapers, and hypervisor-level side-channel monitoring tools. Endpoint compromise invalidates all application-layer cryptography.

---

## 4. Human & Operational Assumptions

1. **Out-of-Band Channel Independence**:
   - We assume the user distributes the Room Link and the Access Pass over **two separate communication channels** (e.g. link via email, pass via Signal or in-person). If an attacker compromises both channels simultaneously, they gain access to the chamber.
2. **Access Pass Entropy**:
   - We assume users utilize the built-in 4-word Diceware generator (~51.6 bits of entropy) or 16-character alphanumeric generator (~82.4 bits of entropy) rather than easily guessable single-word dictionary passwords.
3. **Endpoint Confidentiality**:
   - We assume participants take reasonable precautions against shoulder-surfing and do not leave active rooms unattended in public environments.

---

## 5. Network & Infrastructure Assumptions

1. **TLS Transport Security**:
   - We assume modern TLS (TLS 1.2/1.3) protects transport metadata, preventing on-path tampering with static assets and JavaScript delivery.
2. **Untrusted Relay Boundary**:
   - We explicitly assume the relay server is **untrusted** for confidentiality and integrity. The server is assumed to be honest-but-curious or fully hostile; our protocol guarantees the server cannot decrypt messages or tamper with ciphertexts without detection.
