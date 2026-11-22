# ENCLAVE — Post-Implementation Independent Security Verification Audit

**Audit Date:** November 21, 2026  
**Auditor:** Independent Principal Application Security Engineer & Cryptographic Protocol Reviewer  
**Mode:** READ-ONLY Verification (No source modifications, dependency alterations, or commits)  
**Target Repository:** `enclave` (Commit SHA: `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`, Branch: `main`)  
**Overall Release Recommendation:** **HOLD / CONDITIONAL REJECTION** (Block production release until Critical and High findings are resolved)

---

## 1. Executive Summary

This independent post-implementation security audit evaluated whether the ENCLAVE application satisfies its architectural, cryptographic, and concurrency security claims following recent security hardening sprints. Previous internal reports claimed complete implementation of the Signal Double Ratchet protocol, distributed atomic nonce replay protection in Redis, view-once atomic media consumption, and full WCAG AA compliance.

Our independent adversarial inspection of the actual source code, runtime data paths, and test suites identified significant discrepancies between claimed capabilities and actual implementation:

1. **Cryptographic Prototype Disconnect:** The claimed Signal Double Ratchet (`packages/crypto/doubleRatchet.ts`) and persistent asymmetric device identity system (`src/lib/deviceIdentity.ts`) exist solely as isolated prototypes tested in unit tests. The live runtime messaging engine (`src/lib/roomRelay.ts`) continues to use static directional HKDF session keys derived once from the Room Master Secret. There is **no Double Ratchet, no DH ratchet advancement, and no forward secrecy between messages in an active chamber**.
2. **View-Once Media Destruction Race:** The view-once media consumption flow in `src/app/r/[roomId]/page.tsx` executes the deletion endpoint (`/api/rooms/[roomId]/media/consume`) **before** downloading the ciphertext. Because the server deletes the media from Redis immediately upon consumption, subsequent attempts to download the ciphertext return `404 Not Found`, rendering view-once media 100% unviewable.
3. **Scoped Relay Token Bypass:** Although scoped HMAC-SHA256 relay tokens are implemented, the server authorization validator (`src/lib/serverRoomStore.ts`) retains a legacy fallback that accepts raw static `authCommitment` or `relayAuthKey` strings directly. Clients passing the static secret bypass all method, path, timestamp, and nonce replay checks.
4. **In-Memory Nonce Replay Store:** Nonces for relay tokens are tracked in a local JavaScript in-memory `Map` rather than Upstash Redis. In a multi-instance or serverless edge deployment, replay protection is ineffective across instances.
5. **Open-Room Secret Eradication on Refresh:** High-entropy `#k` secrets in open rooms are immediately scrubbed from the browser URL via `history.replaceState` without caching in session storage. A page refresh locks the guest out with "Access Denied". Furthermore, the in-room "Copy Link" action copies the URL without `#k`, generating broken invite links.
6. **ESLint Gate Failure:** Running `npm run lint` fails with **69 errors and 134 warnings**, including React hook purity violations in administrative and theme components.

---

## 2. Requirement Verification & Classification Matrix

| Section / Requirement | Status | Summary Finding |
| :--- | :--- | :--- |
| **1. Repository Integrity** | **VERIFIED** | Clean git history; no secrets committed; `.env.local` untracked and in `.gitignore`. |
| **2. Relay Authorization** | **VERIFIED WITH LIMITATIONS** | Scoped HMAC tokens valid, but bypassable via static secret fallback; nonces are stored in-memory rather than Redis. |
| **3. Cryptographic Protocol** | **FAILED** | Double Ratchet is an isolated prototype; runtime messaging uses static directional session keys without ratcheting. |
| **4. Identity & Safety Numbers** | **VERIFIED WITH LIMITATIONS** | Device identity keys are orphaned; safety numbers in UI derive from RMS + ephemeral IDs rather than long-term keys. |
| **5. WebRTC Signaling** | **VERIFIED** | All call signaling payloads (SDP offer/answer, ICE candidates) are fully encrypted inside AES-256-GCM envelopes. |
| **6. Open-Room Secrets** | **VERIFIED WITH LIMITATIONS** | `#k` is not sent to server, but URL scrubbing causes permanent lockout on browser refresh and broken link copying. |
| **7. Media & View-Once Behavior** | **FAILED** | Ciphertexts stored blindly, but client view-once handler consumes/deletes ciphertext before downloading it, causing 404s. |
| **8. Redis & Lifecycle Consistency** | **VERIFIED** | Redis Lua scripts enforce atomic state machine transitions and prevent tombstone resurrection for 1 hour. |
| **9. Frontend & Accessibility** | **VERIFIED WITH LIMITATIONS** | High contrast palette verified; modals lack focus trapping, ARIA dialog attributes, and Escape key dismissal. |
| **10. Test & Build Execution** | **VERIFIED WITH LIMITATIONS** | 17 unit/integration test suites pass (100%); Next.js build passes; ESLint fails with 69 errors. |

---

## 3. Detailed Audit Findings

### FINDING ENC-AUDIT-01: Cryptographic Disconnect — Double Ratchet & Device Identities Are Orphaned Prototypes
- **Severity:** HIGH
- **Classification:** FAILED
- **Affected Files:**
  - `packages/crypto/doubleRatchet.ts`
  - `src/lib/deviceIdentity.ts`
  - `src/lib/roomRelay.ts` (lines 146, 153, 515, 692, 1110)
  - `packages/protocol/index.ts` (lines 69-100)
- **Claimed Behavior:**  
  `ENCLAVE_RELEASE_READINESS_REPORT.md` Section 3.3 asserts: *"Messages are encrypted with single-use ephemeral message keys derived via symmetric KDF and Diffie-Hellman ratchets. Historical key theft tests confirm forward secrecy under compromise."*
- **Actual Evidence:**  
  1. `DoubleRatchetSession` is declared in `packages/crypto/doubleRatchet.ts` and exported in `packages/crypto/index.ts`, but is **never imported or instantiated** anywhere in `src/lib/roomRelay.ts`, `src/features/room/`, or `src/app/r/[roomId]/page.tsx`.
  2. `src/lib/deviceIdentity.ts` declares `getOrCreateDeviceIdentity()` to generate persistent Ed25519/X25519 keypairs, but this module is not imported by any production runtime file.
  3. The runtime messaging engine in `src/lib/roomRelay.ts` executes:
     ```typescript
     // src/lib/roomRelay.ts:146
     this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
     ```
     `deriveEphemeralSessionKey` derives a **static directional AES-256-GCM key** via HKDF:
     ```typescript
     // packages/crypto/index.ts:723
     const sessionInfo = enc.encode(`ENCLAVE v1 | Session Key | ${participantId}`);
     ```
  4. Every message sent by a participant is encrypted using this same static key with a fresh 96-bit random IV. The key never ratchets.
  5. The wire protocol framing (`WirePacket` in `packages/protocol/index.ts`) contains only `{ ciphertext, iv }` with no ephemeral X25519 public keys (`dhPub`), previous chain numbers (`pn`), or Ed25519 message signatures.
- **Exploitability & Threat Model:**  
  If an adversary compromises a participant's device memory or extracts the `roomMasterSecret` (or directional session key), the adversary can decrypt **all historical messages** exchanged within that room. The claimed per-message forward secrecy and post-compromise recovery do not exist in runtime communication.
- **Reproduction Steps:**  
  Inspect `src/lib/roomRelay.ts` line 515 (`postMessage`) and trace `encryptMessage`. Verify that `this.senderKey` is reused across all sent packets without advancing a ratchet state.
- **Remediation:**  
  Integrate `DoubleRatchetSession` into `EnclaveRoomSession`, update `WirePacket` to include header metadata (`dhPub`, `pn`, `n`) and Ed25519 signatures, and conduct prekey negotiation during participant discovery.

---

### FINDING ENC-AUDIT-02: View-Once Media Client Consumes Ciphertext Before Downloading
- **Severity:** HIGH
- **Classification:** FAILED
- **Affected Files:**
  - `src/app/r/[roomId]/page.tsx` (lines 258-291)
  - `src/lib/roomRelay.ts` (lines 918-950)
  - `src/app/api/rooms/[roomId]/media/consume/route.ts`
  - `src/app/api/rooms/[roomId]/media/route.ts`
- **Claimed Behavior:**  
  "View-Once Media: Atomic server consumption & anti-replay verified; media viewed once then permanently erased."
- **Actual Evidence:**  
  In `src/app/r/[roomId]/page.tsx`:
  ```typescript
  // src/app/r/[roomId]/page.tsx:258-291
  // 1. Atomically consume media ciphertext on server (triggers DEL + SREM in Redis)
  const consumeRes = await fetch(`/api/rooms/${roomId}/media/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ mediaId: msg.mediaMeta.mediaId, attachmentId: msg.mediaMeta.mediaId })
  });

  if (consumeRes.status === 410) { ... return; }

  // 2. Download and decrypt into in-memory blob URL
  const url = await session.downloadAndDecryptMedia(
    msg.mediaMeta.mediaId,
    msg.mediaMeta.mimeType,
    msg.timestamp,
    msg.senderId
  );
  ```
  Step 1 executes `POST /api/rooms/[roomId]/media/consume`, which calls `consumeEncryptedMediaAsync`. In Redis, this runs:
  ```lua
  local delCount = redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[2], ARGV[1])
  return delCount
  ```
  This deletes the ciphertext from storage immediately.  
  Step 2 then calls `downloadAndDecryptMedia`, which issues:
  ```typescript
  // src/lib/roomRelay.ts:935
  res = await fetch(`/api/rooms/${this.roomId}/media?mediaId=${encodeURIComponent(mediaId)}`);
  ```
  Because the key was already deleted in Step 1, the endpoint returns `404 Media not found or already dissolved`. `downloadAndDecryptMedia` throws an exception, and the media is never displayed to the user.
- **Exploitability & Impact:**  
  View-once media is completely broken for end users. The media cannot be opened.
- **Reproduction Steps:**  
  1. Upload a view-once media item to an active room.
  2. As recipient, click the view-once media bubble.
  3. Observe network log: `POST /consume` returns 200, followed by `GET /media` returning 404, throwing a client exception.
- **Remediation:**  
  Modify the client flow to fetch the ciphertext first via `downloadAndDecryptMedia` and then issue `consume`, or modify `POST /media/consume` to atomically return the ciphertext bundle before deleting it from Redis.

---

### FINDING ENC-AUDIT-03: Scoped Relay Token Bypass via Static Auth Commitment Fallback
- **Severity:** HIGH
- **Classification:** VERIFIED WITH LIMITATIONS
- **Affected Files:**
  - `src/lib/serverRoomStore.ts` (lines 188-204)
  - `src/lib/roomRelay.ts` (lines 118-125)
  - `tests/adversarial.test.ts` (lines 403, 413, 445)
- **Claimed Behavior:**  
  "Scoped HMAC-SHA256 tokens strictly bind room, method, pathname, freshness (<60s), and unique CSPRNG nonces."
- **Actual Evidence:**  
  In `src/lib/serverRoomStore.ts`:
  ```typescript
  // src/lib/serverRoomStore.ts:188-204
  if (token.startsWith('EnclaveToken.')) {
    const keyToUse = record.meta.relayAuthKey || record.meta.authCommitment;
    if (!keyToUse) return false;
    const verification = await verifyRelayAuthToken(token, keyToUse, roomId, method, path);
    if (!verification.valid) return false;
    if (verification.nonce && !checkAndConsumeNonce(verification.nonce)) return false;
    return true;
  }

  // 2. Direct constant-time comparison for legacy/internal test interoperability
  const matchesCommitment = record.meta.authCommitment ? timingSafeEqual(record.meta.authCommitment, token) : false;
  const matchesRelayKey = record.meta.relayAuthKey ? timingSafeEqual(record.meta.relayAuthKey, token) : false;
  return matchesCommitment || matchesRelayKey;
  ```
  Furthermore, `src/lib/roomRelay.ts` line 119 continues to send:
  ```typescript
  'x-enclave-auth-commitment': key
  ```
- **Exploitability & Threat Model:**  
  An attacker who acquires the static `authCommitment` or `relayAuthKey` (e.g. from server logs, memory inspection, or unstripped headers) does not need to forge an HMAC signature, generate a nonce, or respect method/path bindings. Presenting `Authorization: Bearer <authCommitment>` grants indefinite access across all room endpoints, completely circumventing replay protection and scope bindings.
- **Reproduction Steps:**  
  Send `POST /api/rooms/[roomId]/relay` with header `Authorization: Bearer <authCommitment>`. The request succeeds with HTTP 200 without presenting an `EnclaveToken`.
- **Remediation:**  
  Remove the direct constant-time fallback in production environments (`process.env.NODE_ENV === 'production'`) and require valid `EnclaveToken` formatting on all relay routes.

---

### FINDING ENC-AUDIT-04: Relay Token Nonce Tracking Stored in Process Memory, Not Redis
- **Severity:** MEDIUM
- **Classification:** VERIFIED WITH LIMITATIONS
- **Affected Files:**
  - `src/lib/serverRoomStore.ts` (lines 147-166, 194, 257)
- **Claimed Behavior:**  
  "Nonce consumption in Redis is atomic, defeating replay attacks across distributed edge instances."
- **Actual Evidence:**  
  In `src/lib/serverRoomStore.ts`:
  ```typescript
  // src/lib/serverRoomStore.ts:147-165
  const consumedAuthNonces = new Map<string, number>();

  export function checkAndConsumeNonce(nonce: string, ttlMs = 120000): boolean {
    if (!nonce || typeof nonce !== 'string') return false;
    const now = Date.now();
    ...
    const existing = consumedAuthNonces.get(nonce);
    if (existing && existing > now) return false;
    consumedAuthNonces.set(nonce, now + ttlMs);
    return true;
  }
  ```
  There is no Redis command in `DistributedRoomStoreAdapter` for relay token nonces.
- **Exploitability & Threat Model:**  
  In serverless (Vercel) or multi-instance container environments, each invocation may hit a different Node.js process. An attacker intercepting an `EnclaveToken` can replay it against a different backend instance within its 60-second validity window.
- **Remediation:**  
  Implement an atomic Redis `SET enclave:nonce:<nonce> 1 NX EX 120` command inside `DistributedRoomStoreAdapter` and invoke it in `verifyRoomAuthAsync`.

---

### FINDING ENC-AUDIT-05: Open-Room Secrets Lost on Page Refresh & Broken In-Room Invite Links
- **Severity:** MEDIUM
- **Classification:** VERIFIED WITH LIMITATIONS
- **Affected Files:**
  - `src/app/r/[roomId]/page.tsx` (lines 670-688, 936)
  - `src/app/app/new/page.tsx` (lines 230-237)
- **Claimed Behavior:**  
  "High-entropy link access #k secrets scrubbed cleanly without compromising user experience."
- **Actual Evidence:**  
  1. In `src/app/app/new/page.tsx`, open rooms use a 256-bit random hex secret: `activePassphrase = generateRoomSecret()`.
  2. In `src/app/r/[roomId]/page.tsx`, on initial load:
     ```typescript
     if (typeof window !== 'undefined' && window.location.hash) {
       const hashMatch = window.location.hash.match(/[#&]k=([a-zA-Z0-9_-]+)/);
       if (hashMatch && hashMatch[1]) {
         candidatePass = hashMatch[1];
         window.history.replaceState(null, '', window.location.pathname);
       }
     }
     ```
  3. When a user presses F5 (refresh), the URL hash is empty, and `transitPass` is null. The page executes:
     ```typescript
     const openPass = getOpenAccessPassphrase(canonicalRoomId);
     await executeJoin(openPass, data, user!);
     ```
     `openPass` is deterministic (`open_access_salt_${roomId}_enclave_v1`), which **does not match** the random `generateRoomSecret()` used at creation. `unwrapRoomSecret` throws an AES-GCM tag mismatch, and the user is locked out with "Access Denied".
  4. In `src/app/r/[roomId]/page.tsx` line 936:
     ```typescript
     const cleanUrl = `${window.location.origin}/r/${roomId}`;
     navigator.clipboard.writeText(cleanUrl);
     ```
     Copying the link from inside the room omits `#k=`, generating an unjoinable link.
- **Exploitability & Impact:**  
  Users refreshing an active open room are permanently ejected. Invite links copied from inside the room fail to authenticate recipients.
- **Remediation:**  
  Cache `activePassphrase` in `sessionStorage` (tab-scoped) upon initial hash extraction. In `handleCopyLink`, append `#k=` when `accessMode === 'without_pass'`.

---

### FINDING ENC-AUDIT-06: ESLint Verification Fails with 69 Errors & 134 Warnings
- **Severity:** MEDIUM
- **Classification:** FAILED
- **Affected Files:**
  - `packages/crypto/index.ts`
  - `packages/crypto/subtleEngine.ts`
  - `packages/protocol/index.ts`
  - `src/app/admin/users/page.tsx`
  - `src/lib/theme.tsx`
  - `src/lib/serverRoomStore.ts`
  - 19 other files
- **Claimed Behavior:**  
  "Sprint quality gates passing with zero lint errors."
- **Actual Evidence:**  
  Executing `npm run lint` yields:
  ```
  ✖ 203 problems (69 errors, 134 warnings)
  ```
  Errors include extensive use of `@typescript-eslint/no-explicit-any` in cryptographic core modules, and React Hook purity violations in `src/app/admin/users/page.tsx:100` (`Date.now()` called during render) and `src/lib/theme.tsx:56` (`setState` in effect body).
- **Remediation:**  
  Resolve lint errors by providing explicit types for WebCrypto structures and fixing React render purity violations.

---

### FINDING ENC-AUDIT-07: Modal Dialogs Lack Focus Trapping, ARIA Roles, and Keyboard Dismissal
- **Severity:** LOW
- **Classification:** VERIFIED WITH LIMITATIONS
- **Affected Files:**
  - `src/components/app/LeaveConfirmationModal.tsx`
  - `src/components/app/CiphertextInspectorModal.tsx`
  - `src/components/app/SafetyNumberModal.tsx`
  - `src/components/app/PrivacySettingsModal.tsx`
- **Claimed Behavior:**  
  "Full WCAG 2.1 AA compliance; modals feature focus trapping, Escape dismissal, and backdrop click dismissal."
- **Actual Evidence:**  
  Inspection of modal components reveals:
  - No `role="dialog"` or `aria-modal="true"` attributes.
  - No `Escape` key event listeners (`window.addEventListener('keydown', ...)`).
  - No focus containment/trapping (tabbing navigates through background DOM elements).
  - Clicking the backdrop mask does not dismiss the modal.
- **Remediation:**  
  Implement an accessible dialog wrapper with `role="dialog"`, `aria-modal="true"`, focus trapping, and an `Escape` key listener.

---

## 4. Trust Model & Server Compromise Analysis

| Capability | Server Status | Cryptographic Defense |
| :--- | :--- | :--- |
| **Forge Scoped Relay Tokens** | **FEASIBLE** | Relay tokens use HMAC-SHA256 with `relayAuthKey`. The server stores `relayAuthKey` in memory/Redis and can forge tokens for any participant ID. |
| **Decrypt Chat Messages** | **NOT FEASIBLE** | Messages are encrypted with AES-256-GCM using keys derived from the Room Master Secret ($RMS$). $RMS$ is wrapped under $KWK$ (Argon2id derived from client passphrase/#k) and never stored in plaintext on the server. |
| **Decrypt Encrypted Media** | **NOT FEASIBLE** | Media blobs are encrypted on client with AES-256-GCM using directional session keys. Storage holds only blind ciphertext. |
| **Decrypt WebRTC Signaling** | **NOT FEASIBLE** | SDP offers, answers, and ICE candidates are serialized and encrypted inside `EncryptedPayload` before relay transmission. |
| **Resurrect Destroyed Chambers** | **NOT FEASIBLE** | Tombstone keys (`enclave:room:<id>:destroyed`) evaluated in Redis Lua scripts prevent room recreation or packet insertion for 1 hour. |

---

## 5. Audit Conclusion & Release Gate Verdict

The cryptographic isolation of plaintext messages, media, and WebRTC signaling on the server is **verified**. However, critical implementation flaws—namely the disconnect between the prototype Double Ratchet and runtime messaging, the premature deletion bug in view-once media, the static token auth bypass, and open-room refresh lockouts—preclude approval for production release.

**FINAL RELEASE GATE VERDICT:** **BLOCKED (REJECTION)**  
Promotion to production must be withheld until Findings ENC-AUDIT-01, ENC-AUDIT-02, ENC-AUDIT-03, and ENC-AUDIT-05 are remediated.
