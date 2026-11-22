# ENCLAVE — Final Remediation Verification & Production Release Gate Report

**Date of Audit:** November 21, 2026  
**Auditor Role:** Independent Principal Cryptographic Protocol Auditor & Application Security Reviewer  
**Audit Mode:** STRICT READ-ONLY (Zero code, dependency, git, or deployment modifications)  
**Repository Working Directory:** `c:\Users\harsh\OneDrive\Desktop\enclave`  
**Audited Baseline Commit:** `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`  
**Current Branch:** `main`  
**Final Release Decision:** **BLOCKED FOR PRODUCTION RELEASE / CONDITIONALLY APPROVED FOR CONTROLLED STAGING ONLY**  

---

## 1. Executive Summary

An exhaustive, independent, read-only cryptographic protocol audit and code inspection was conducted across the ENCLAVE repository to establish whether recent remediations satisfy claimed security properties in the actual runtime.

### Critical Verdict Summary
1. **Double Ratchet Live Integration:** **FAILED.**  
   `DoubleRatchetSession` ([packages/crypto/doubleRatchet.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/packages/crypto/doubleRatchet.ts)) is completely disconnected from the live application messaging pipeline. It is not imported or instantiated anywhere in `src/`. The live runtime ([src/lib/roomRelay.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/roomRelay.ts)) continues to encrypt and decrypt all messages, media, reactions, receipts, and signaling using static directional HKDF session keys derived from the Room Master Secret ($RMS$). No Diffie-Hellman ratcheting, symmetric chain advancement, per-message ephemeral key derivation, or skipped-key replay tracking occurs on the live wire. Forward secrecy is **not established** in the running application.
2. **Ed25519 Device Identity Security:** **VERIFIED WITH LIMITATIONS.**  
   Ed25519 asymmetric device identity generation, persistent storage, and wire packet signing/verification are functional. However, the protocol operates on an unauthenticated **Trust-On-First-Use (TOFU)** basis. If an identity key changes mid-session, the client logs a warning and fires a listener, but does **not drop the packet** or halt communication, and the user interface does not currently subscribe to identity change events.
3. **Relay Authorization & Bypass Elimination:** **VERIFIED.**  
   The static `x-enclave-auth-commitment` header extraction and production fallback to static credentials have been completely eliminated. Production endpoints enforce the `EnclaveToken.` prefix and validate HMAC-SHA256 signatures, freshness ($<60$s), method binding, canonical pathname binding, and single-use CSPRNG nonces across all room API routes.
4. **Distributed Redis Nonce Concurrency:** **VERIFIED.**  
   Nonce deduplication utilizes atomic Redis `SET enclave:room:<rid>:nonce:<nonce> 1 EX 120 NX` operations. Simultaneous requests across distributed edge serverless instances are serialized by Redis; only the first request succeeds while concurrent attempts are rejected. Production mode fails closed if Redis is unavailable.
5. **View-Once Media Lifecycle:** **VERIFIED WITH LIMITATIONS.**  
   The prior "delete-then-fetch" race condition is resolved. View-once media is retrieved and deleted atomically via a Redis Lua script (`GET + DEL + SREM`) in `/api/rooms/[roomId]/media/consume`. However, this implements **strict single-attempt consumption**, not reliable one-time delivery: an interrupted network response permanently destroys the media without client receipt.
6. **Open-Room Secret (`#k=`) Persistence:** **VERIFIED WITH LIMITATIONS.**  
   Link-access secrets are high-entropy CSPRNG values passed via URL hash fragments (`#k=`), scrubbed from browser history via `window.history.replaceState`, and cached in tab-scoped `sessionStorage` for seamless refresh. However, secrets in `sessionStorage` are vulnerable to origin-level XSS, and closing the tab destroys access unless the full invitation link is retained.
7. **Accessibility & Quality Gates:** **VERIFIED WITH LIMITATIONS.**  
   All 17 test suites pass 100%, TypeScript passes with 0 errors, ESLint passes with 0 errors (203 warnings), and Next.js Turbopack compiles all 57 routes. Modals implement `role="dialog"`, `aria-modal="true"`, focus trapping, Escape dismissal, and backdrop click handlers, but lack focus restoration to the trigger element upon closing.

---

## 2. Repository & Working Tree Status

- **Repository Root:** `c:\Users\harsh\OneDrive\Desktop\enclave`
- **Current Branch:** `main`
- **HEAD Commit SHA:** `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`
- **Branch Tracking:** Up to date with `origin/main`
- **Working Tree Integrity:** Preserved all unstaged and untracked files; zero commits, resets, or push operations performed during audit.
- **Secret Verification:** Confirmed no `.env`, `.env.local`, API tokens, private keys, or deployment credentials are staged or committed.

---

## 3. Files Inspected

Line-by-line static analysis and runtime tracing were conducted on the following primary files:
- [src/lib/roomRelay.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/roomRelay.ts) (Live message lifecycle, packet framing, signing, encryption, and dispatch)
- [packages/crypto/index.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/packages/crypto/index.ts) (Cryptographic primitives, Argon2id, HKDF, RMS wrapping, session key derivation)
- [packages/crypto/doubleRatchet.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/packages/crypto/doubleRatchet.ts) (Isolated Double Ratchet engine)
- [packages/protocol/index.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/packages/protocol/index.ts) (WirePacket, RatchetHeader, RoomMeta protocol definitions)
- [src/lib/deviceIdentity.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/deviceIdentity.ts) (Ed25519 and X25519 identity generation, signing, safety numbers)
- [src/lib/serverRoomStore.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/serverRoomStore.ts) (Token extraction, authorization verification, destruction proofs)
- [src/lib/serverRoomAdapter.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/serverRoomAdapter.ts) (Distributed Redis adapter, Lua scripts, atomic nonce SET NX)
- [src/app/r/[roomId]/page.tsx](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/r/[roomId]/page.tsx) (Client room coordinator, view-once consumption, fragment parsing, session storage)
- [src/app/app/new/page.tsx](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/app/new/page.tsx) (Room creation, secret generation, invitation formatting)
- [src/app/api/rooms/[roomId]/media/consume/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/api/rooms/[roomId]/media/consume/route.ts) (Atomic view-once media consumption API)
- [src/app/api/rooms/[roomId]/relay/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/api/rooms/[roomId]/relay/route.ts) (Encrypted packet relay API)
- [src/app/api/rooms/[roomId]/turn/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/api/rooms/[roomId]/turn/route.ts) (Scoped WebRTC TURN credentials API)
- [src/app/api/rooms/[roomId]/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/api/rooms/[roomId]/route.ts) (Sanitized metadata discovery & admin destruction)
- [src/lib/useAccessibleModal.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/useAccessibleModal.ts) (Modal accessibility hook)
- [tests/securityRemediationRegression.test.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/tests/securityRemediationRegression.test.ts) (14 regression test invariants)

---

## 4. Deep Architectural Verification & Runtime Traces

### 4.1 Requirement 1: Live Double Ratchet Integration — FAILED

#### Executable Call Path Trace:
```
User types text
  │
  ▼
handleSendMessage (src/app/r/[roomId]/page.tsx:210)
  │
  ▼
EnclaveRoomSession.sendMessage (src/lib/roomRelay.ts:616)
  │
  ▼
encryptMessage (packages/crypto/index.ts:741)
  │
  ├─ Uses: this.senderKey (derived at session init via deriveEphemeralSessionKey)
  │        HKDF(RMS, "ENCLAVE v1 | Session Key | <user.id>")
  │        Static directional AES-256-GCM key — NO DH RATCHET
  │
  ▼
signAndEmitWirePacket (src/lib/roomRelay.ts:154)
  │
  ├─ Attaches: version = 2, senderIdentityKey, signature
  │  Omits: ratchetHeader (ratchetHeader is undefined on all emitted wire packets)
  │
  ▼
Relay Server POST /api/rooms/[roomId]/relay
  │
  ▼
handleIncomingPacket (src/lib/roomRelay.ts:417)
  │
  ├─ Verifies Ed25519 signature
  ├─ Fetches: key = this.getReceiverKey(packet.senderId)
  │           HKDF(RMS, "ENCLAVE v1 | Session Key | <senderId>")
  │           Static directional AES-256-GCM key — NO DH RATCHET
  │
  ▼
decryptMessage (packages/crypto/index.ts:784)
  │
  ▼
messageListeners.forEach -> setMessages -> UI Render
```

#### Detailed Inspection Evidence:
1. **Disconnection of `DoubleRatchetSession`:**
   A global repository search for `DoubleRatchetSession` confirms it is referenced **only** in:
   - `packages/crypto/doubleRatchet.ts`
   - `tests/doubleRatchetAndIdentity.test.ts`
   - `tests/prototype/doubleRatchetPrototype.ts`
   - `tests/prototype/verifyDoubleRatchet.test.ts`
   `DoubleRatchetSession` is **not imported anywhere** in `src/`, `src/lib/roomRelay.ts`, or `src/app/r/[roomId]/page.tsx`.
2. **Static Session Keys in Runtime:**
   In [src/lib/roomRelay.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/roomRelay.ts#L189-L205):
   ```typescript
   private async initSessionKeys() {
     if (!this.roomMasterSecret) return;
     this.senderKey = await deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id);
     ...
   }

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
   In [packages/crypto/index.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/packages/crypto/index.ts#L708-L736):
   ```typescript
   export async function deriveEphemeralSessionKey(
     roomMasterSecret: Uint8Array,
     participantId: string
   ): Promise<EnclaveCryptoKey> {
     ...
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
3. **Absence of Wire Ratchet Headers:**
   While the `WirePacket` interface in `packages/protocol/index.ts` declares an optional `ratchetHeader?: RatchetHeader`, inspecting `sendMessage` (line 642), `sendMediaMessage` (line 690), `sendReceipt` (line 595), and `sendReaction` (line 750) in `src/lib/roomRelay.ts` confirms that **no `ratchetHeader` is ever constructed or populated**.
4. **Failure of Forward Secrecy:**
   Because all messages from participant $A$ are encrypted under the exact same symmetric key $K_A = \text{HKDF}(RMS, A)$, compromise of $K_A$ or $RMS$ at any point in time retroactively exposes every prior message sent by $A$. Forward secrecy is completely absent in the live messaging pipeline.

---

### 4.2 Requirement 2: Ed25519 Identity Security — VERIFIED WITH LIMITATIONS

#### Implementation Verification:
1. **Device Identity Generation & Persistence:**
   In [src/lib/deviceIdentity.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/deviceIdentity.ts#L25-L94), `generateFreshDeviceIdentity()` generates an Ed25519 keypair and an X25519 prekey via native `crypto.subtle`. Keys are exported as raw/PKCS#8 hex and stored in `localStorage` under `enclave_device_identity_v2`.
2. **Wire Packet Signing & Verification:**
   In `src/lib/roomRelay.ts` (lines 154–167), `signAndEmitWirePacket` computes an Ed25519 signature over canonical payload `${packetId}:${roomId}:${senderId}:${sequence}:${timestamp}:${ciphertext}` and attaches `packet.senderIdentityKey` and `packet.signature`.
   In `handleIncomingPacket` (lines 449–460), `verifyDeviceIdentitySignature` validates the signature. Tampered payloads and forged signatures are rejected and dropped.
3. **Safety Number Symmetry:**
   `calculateSafetyNumber(pubA, pubB)` computes a deterministic 60-digit representation (12 blocks of 5 digits) via lexicographically sorted SHA-512.

#### Identified Limitations & Vulnerabilities:
1. **Trust-On-First-Use (TOFU) Vulnerability:**
   In `src/lib/roomRelay.ts` (lines 461–466):
   ```typescript
   const existingKey = this.knownPeerIdentities.get(packet.senderId);
   if (existingKey && existingKey.toLowerCase() !== packet.senderIdentityKey.toLowerCase()) {
     console.warn(`[ENCLAVE] Identity key change detected for participant ${packet.senderId}`);
     this.identityChangeListeners.forEach(fn => fn(packet.senderId, existingKey, packet.senderIdentityKey!));
   }
   this.knownPeerIdentities.set(packet.senderId, packet.senderIdentityKey);
   ```
   On first contact, the identity key is blindly trusted and saved. If an active adversary intercepts the initial packet and substitutes an attacker key, the client accepts it without verification.
2. **Non-Blocking Key Substitution:**
   When an identity key changes mid-conversation, `roomRelay.ts` fires `identityChangeListeners` and updates `knownPeerIdentities`, but **it does not drop the packet**. The packet from the substituted key is decrypted and delivered to listeners.
3. **Missing UI Listener:**
   Searching all React components (`src/`) for `onIdentityChange` reveals **zero subscriptions**. The frontend UI never registers a listener on `session.onIdentityChange`. As a result, when an identity key changes, no warning banner, alert dialog, or blocking modal is shown to the user.

---

### 4.3 Requirement 3: Relay Authentication Bypass Elimination — VERIFIED

#### Audit Findings:
1. **Static Header Elimination:**
   Extraction of `x-enclave-auth-commitment` was removed from `extractAuthProof()` ([src/lib/serverRoomStore.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/serverRoomStore.ts#L131-L141)).
2. **Production Enforcement:**
   In [src/lib/serverRoomStore.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/serverRoomStore.ts#L182-L200):
   ```typescript
   if (token.startsWith('EnclaveToken.')) {
     const keyToUse = record.meta.relayAuthKey || record.meta.authCommitment;
     if (!keyToUse) return false;
     const verification = await verifyRelayAuthToken(token, keyToUse, roomId, method, path);
     if (!verification.valid) return false;
     if (verification.nonce) {
       const consumed = await checkAndConsumeNonceAsync(verification.nonce, roomId);
       if (!consumed) return false;
     }
     return true;
   }

   const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
   if (isProduction) {
     return false;
   }
   ```
   In production mode (`process.env.NODE_ENV === 'production'`), any request without a valid `EnclaveToken.` immediately returns `false` (HTTP 401).
3. **Endpoint Coverage:**
   All 6 room API routes invoke `verifyRoomAuthAsync(roomId, authProof, request.method, pathname)`:
   - `POST /api/rooms/[roomId]/relay`
   - `GET /api/rooms/[roomId]/relay`
   - `POST /api/rooms/[roomId]/presence`
   - `POST /api/rooms/[roomId]/media`
   - `GET /api/rooms/[roomId]/media`
   - `POST /api/rooms/[roomId]/media/consume`
   - `GET /api/rooms/[roomId]/turn`
4. **Token Model:**
   Tokens bind `rid` (room), `pid` (participant), `m` (method), `p` (canonical path), `ts` (freshness within $\pm 60$s), and `nonce`. HMAC-SHA256 signature is verified in constant time.

---

### 4.4 Requirement 4: Redis Nonce Concurrency — VERIFIED

#### Code Verification:
In [src/lib/serverRoomAdapter.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/lib/serverRoomAdapter.ts#L1248-L1263):
```typescript
async consumeNonce(nonce: string, roomId?: string, ttlSeconds = 120): Promise<boolean> {
  if (!nonce || typeof nonce !== 'string') return false;
  const key = this.nonceKey(nonce, roomId);
  try {
    const res = await this.redisCommand<string | null>(['SET', key, '1', 'EX', ttlSeconds, 'NX']);
    return res === 'OK';
  } catch (err) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw new Error(
        `[ENCLAVE FAIL CLOSED] Distributed nonce consumption failed in production: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    return false;
  }
}
```
- **Namespacing:** Keys are namespaced as `enclave:room:<roomId>:nonce:<nonce>`.
- **Atomic Concurrency:** The Redis command `SET key 1 EX 120 NX` is atomic. In a multi-instance serverless deployment, concurrent requests with identical nonces compete for `NX`. Exactly one instance receives `OK`; all others receive `null` and return HTTP 401.
- **Fail-Closed:** In production, any Redis failure throws a fatal error failing closed.

---

### 4.5 Requirement 5: View-Once Media Lifecycle — VERIFIED WITH LIMITATIONS

#### Execution Trace:
1. Client initiates view: `handleOpenViewOnce` in `src/app/r/[roomId]/page.tsx` (line 250).
2. Client sends `POST /api/rooms/[roomId]/media/consume` with scoped `EnclaveToken`.
3. In [src/app/api/rooms/[roomId]/media/consume/route.ts](file:///c:/Users/harsh/OneDrive/Desktop/enclave/src/app/api/rooms/[roomId]/media/consume/route.ts#L39-L67), invokes `consumeAndRetrieveMediaAsync(roomId, mediaId)`.
4. Redis executes Lua script `LUA_CONSUME_AND_RETRIEVE_MEDIA`:
   ```lua
   local val = redis.call('GET', KEYS[1])
   if val then
     redis.call('DEL', KEYS[1])
     redis.call('SREM', KEYS[2], ARGV[1])
     return val
   else
     return nil
   end
   ```
5. Endpoint returns `{ success: true, media: { ciphertext, iv, mimeType, size } }` with `Cache-Control: no-store, no-cache, must-revalidate`.
6. Client decrypts ciphertext in memory via AES-256-GCM. Plaintext is never held on the server.

#### Crucial Behavioral Distinction:
- **Strict Single-Attempt Consumption (Not Reliable Delivery):**  
  Because the Redis Lua script executes `GET` and `DEL` in a single atomic step, the server wipes the ciphertext **before the HTTP response bytes reach the client**. If a network partition, client timeout, or dropped connection occurs while the response is in transit, the client never receives the ciphertext. When the client retries, Redis returns `nil` and the server responds with HTTP 410 Gone. The media is **permanently destroyed without ever having been viewed**.
- **No Client-Side Recording Defense:**  
  The application cannot prevent recipients from taking OS-level screenshots, filming the monitor with an external device, or dumping memory buffers.

---

### 4.6 Requirement 6: Open-Room Secrets (`#k=`) — VERIFIED WITH LIMITATIONS

#### Verification Findings:
1. **Entropy & URL Format:**  
   In `src/app/app/new/page.tsx` (line 232), passwordless rooms generate a 256-bit CSPRNG hex secret via `generateRoomSecret()`. The link is constructed as `https://enclave.vercel.app/r/<roomId>#k=<secret>`.
2. **Zero Network Transmission:**  
   Per RFC 3986, fragments are never transmitted to HTTP servers. Network logs and API routes confirm `#k=` never appears in request headers or paths.
3. **History Scrubbing & Tab Storage:**  
   In `src/app/r/[roomId]/page.tsx` (lines 691–704), `#k=` is parsed from `window.location.hash`, written to `sessionStorage.setItem('enclave_room_pass_' + canonicalRoomId, candidatePass)`, and immediately scrubbed from the address bar via `window.history.replaceState(null, '', window.location.pathname)`.
4. **Tab Refresh & Multi-Tab Isolation:**  
   Refreshing the tab recovers the key from `sessionStorage` (line 684). Opening the scrubbed URL in a separate tab or second browser lacks `#k=` and `sessionStorage`, causing the AES-GCM unwrap to fail with an authentication error and denying access.
5. **Telemetry & Logging:**  
   Zero analytics SDKs (Google Analytics, Mixpanel, Sentry, Datadog) exist in `package.json`. No secrets leak into telemetry.
6. **XSS Limitation:**  
   `sessionStorage` is accessible to any script executing within the same origin. Any Cross-Site Scripting (XSS) vulnerability would allow full extraction of stored room passphrases.

---

### 4.7 Requirement 7: Accessibility & Quality Gates — VERIFIED WITH LIMITATIONS

#### Execution of Automated Quality Commands:
1. **TypeScript Typecheck:**
   ```powershell
   npx tsc --noEmit
   # Exit code: 0 (0 errors)
   ```
2. **ESLint Static Analysis:**
   ```powershell
   npm run lint
   # Exit code: 0 (0 errors, 203 warnings)
   ```
3. **Automated Security Regression Suite:**
   ```powershell
   npm test (npx tsx tests/runAllTests.ts)
   # Exit code: 0 (17 of 17 test suites passed, 100% pass rate)
   # Suite 15: All 14 critical regression invariants passed
   ```
4. **Production Turbopack Build:**
   ```powershell
   npm run build
   # ▲ Next.js 16.3.8 (Turbopack)
   # ✓ Compiled successfully in 8.7s
   # ✓ Generating static pages using 1 worker (57/57) in 4.2s
   # Exit code: 0
   ```

#### Modal Accessibility Inspection:
- **Implemented:** `useAccessibleModal` attaches `role="dialog"`, `aria-modal="true"`, and traps keyboard Tab/Shift+Tab navigation within focusable elements. Escape keydown triggers `onClose()`.
- **Limitations:** `useAccessibleModal` does **not** capture `document.activeElement` before opening or restore focus to the trigger button upon unmounting. Background document scroll locking (`overflow: hidden`) is also not applied to `document.body`.

---

## 5. Comprehensive Classification Matrix

| Requirement / Subsystem | Audit Status | Code Present | Runtime Integrated | Tests Passing | Security Property Established | Rationale / Evidence |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1. Live Double Ratchet Integration** | **FAILED** | YES (Isolated) | **NO** | YES (Unit only) | **NO** | `DoubleRatchetSession` is not imported in `src/`. Live `roomRelay.ts` encrypts using static directional HKDF keys. Forward secrecy is not established. |
| **2. Ed25519 Device Identity Security** | **VERIFIED WITH LIMITATIONS** | YES | YES | YES | PARTIAL | Signatures verified and tampered packets dropped; but uses TOFU, mid-session key changes do not drop packets, and UI lacks identity listeners. |
| **3. Relay Authorization Bypass Elimination** | **VERIFIED** | YES | YES | YES | **YES** | Static header removed; production strictly enforces `EnclaveToken.` with HMAC, method, path, expiry, and single-use nonces. |
| **4. Redis Nonce Concurrency & Anti-Replay** | **VERIFIED** | YES | YES | YES | **YES** | Atomic Redis `SET ... EX ... NX` serializes multi-instance edge requests. Fail-closed in production. |
| **5. View-Once Media Lifecycle** | **VERIFIED WITH LIMITATIONS** | YES | YES | YES | PARTIAL | Atomic Lua fetch-and-delete prevents race conditions, but enforces destructive read (single-attempt consumption), risking media loss on network drop. |
| **6. Open-Room Secret (`#k=`) Persistence** | **VERIFIED WITH LIMITATIONS** | YES | YES | YES | PARTIAL | High-entropy fragment preserved in tab `sessionStorage` and scrubbed from history; but vulnerable to XSS in same origin and lost on tab close. |
| **7. Quality & Accessibility Gates** | **VERIFIED WITH LIMITATIONS** | YES | YES | YES | PARTIAL | Tests (17/17), tsc (0 errors), lint (0 errors), build (57/57 routes) pass. Modals have focus trap and Escape, but lack focus restoration. |

---

## 6. Reproduction Steps for Failures & Security Gaps

### 6.1 Demonstration that Live Pipeline Uses Static Directional Keys (Failure of Req 1)
1. Inspect `src/lib/roomRelay.ts` lines 189–205 and 628–637.
2. Note that `this.senderKey` is derived once upon session initialization via `deriveEphemeralSessionKey(this.roomMasterSecret, this.user.id)`.
3. Send 5 consecutive messages using `session.sendMessage("msg 1")` through `session.sendMessage("msg 5")`.
4. Inspect the resulting wire packets: each packet is encrypted under the exact same `senderKey`.
5. Note that `wirePacket.ratchetHeader` is `undefined`.
6. Compromise `senderKey` at message 5: all prior 4 messages can be immediately decrypted. Forward secrecy fails.

### 6.2 Demonstration of Silent Mid-Session Identity Key Change (Req 2 Limitation)
1. Participant $A$ connects with device identity $IK_{A1}$ and transmits packet 1. Participant $B$ saves $IK_{A1}$ in `knownPeerIdentities`.
2. Participant $A$ changes key to $IK_{A2}$ (or an attacker spoofs participant $A$ with $IK_{\text{attacker}}$) and transmits packet 2.
3. In `handleIncomingPacket` (lines 462–466), a warning is logged to `console.warn`, and `this.identityChangeListeners` is called.
4. Because no UI component subscribes to `onIdentityChange`, no alert is shown to user $B$.
5. The packet is **not dropped**; execution falls through to line 523 and decrypts the message, displaying it in the chat feed as authentic.

### 6.3 Demonstration of View-Once Media Loss on Interrupted Connection (Req 5 Limitation)
1. Upload a view-once media item to a room.
2. Participant $B$ clicks to view the media, dispatching `POST /api/rooms/[roomId]/media/consume`.
3. Redis executes Lua script: `GET` succeeds, `DEL` immediately deletes the media from Redis.
4. Simulate a client connection abort before the response body finishes downloading.
5. Participant $B$ retries the view request: the server returns HTTP 410 Gone (`Media has already been viewed and permanently erased`).
6. The recipient never saw the image, yet the media is permanently unrecoverable.

---

## 7. Residual Security Limitations

1. **Absence of Forward Secrecy & Post-Compromise Security:**  
   Until `DoubleRatchetSession` is wired directly into `roomRelay.ts`, communications rely on static symmetric session keys. A breach of the Room Master Secret compromises historical transcripts.
2. **Trust-On-First-Use (TOFU) Key Exchange:**  
   Initial identity keys are accepted without out-of-band verification. Active MITM adversaries at room creation can inject rogue identity keys.
3. **Destructive Read Semantics for View-Once Media:**  
   Network disruptions during ciphertext response transfer result in permanent media destruction without delivery acknowledgment.
4. **Origin-Level Storage Boundaries:**  
   Secrets cached in `sessionStorage` and device identities in `localStorage` are vulnerable to any JavaScript execution compromise (XSS) within the origin.
5. **In-Browser Memory Zeroization:**  
   While `Uint8Array` buffers are zeroized with `.fill(0)`, JavaScript engine garbage collectors may retain transient string representations in heap memory.

---

## 8. Final Release Decision

In accordance with strict application security standards and the absence of live Double Ratchet integration:

### Verdict: **BLOCKED FOR PRODUCTION RELEASE**
### Staging Verdict: **CONDITIONALLY APPROVED FOR CONTROLLED STAGING ONLY**

#### Conditions Required Before Production Release Approval:
1. **Wire DoubleRatchetSession into `src/lib/roomRelay.ts`:**
   - Instantiate pairwise `DoubleRatchetSession` instances between participants upon presence discovery.
   - Replace static `deriveEphemeralSessionKey` with `ratchet.ratchetEncrypt` and `ratchet.ratchetDecrypt`.
   - Populate `wirePacket.ratchetHeader` on all transmitted packets.
   - Advance the symmetric sending chain on every message and execute DH ratchet steps upon receiving new peer public keys.
2. **Block Packets on Identity Key Changes:**
   - Modify `handleIncomingPacket` to reject and drop packets if `packet.senderIdentityKey` does not match the established peer identity.
   - Surface an interactive verification modal in `src/app/r/[roomId]/page.tsx` prompting the user to accept or reject the identity change.
3. **Implement Focus Restoration in Accessible Modals:**
   - Capture `document.activeElement` upon modal open and restore focus upon modal unmount.
