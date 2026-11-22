# ENCLAVE — Backend Implementation Specification
**Document Status:** Final Backend Architecture Specification  
**Classification:** Technical / Infrastructure Standard  
**Revision:** 2.0 (Post-Hardening Sprint)  
**Target Environment:** Next.js 16 App Router (Node.js runtime) + Upstash Redis  

---

## 1. Overview & Architecture Philosophy

The ENCLAVE backend operates as a high-performance, stateless, blind relay coordinator. It adheres to three non-negotiable architectural axioms:
1. **Zero Plaintext Access:** The backend never receives, processes, logs, or stores unencrypted message payloads, media bytes, or WebRTC signaling data.
2. **Volatile-Only Memory:** Room state, active packets, and presence heartbeats exist strictly in volatile memory (Upstash Redis with strict TTLs) and are purged immediately upon room dissolution.
3. **Fail-Closed Security:** In production (`NODE_ENV === 'production'`), if external Redis credentials are unconfigured or connectivity fails, the backend immediately fails closed rather than falling back to non-distributed or insecure modes.

---

## 2. API Endpoint Catalog & Invariants

All endpoints reside under `src/app/api/` and run on the Node.js runtime (`export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`).

### 2.1 Room Registration: `POST /api/rooms`
- **Purpose:** Registers room public metadata and server authorization keys.
- **Request Body:**
  ```json
  {
    "roomId": "8f92-c0e4",
    "salt": "base64-salt",
    "wrappedSecretBundle": "base64-bundle",
    "relayAuthKey": "hex-key",
    "adminPublicKey": "hex-key",
    "accessMode": "with_pass" | "without_pass",
    "requirePass": true | false
  }
  ```
- **Invariants:**
  - `roomId` is normalized to lowercase and validated against regex `^[a-z0-9-]+$`.
  - Rate limited per client IP (max 10 creations per 10 minutes).
  - Rejects if room ID is already active or in tombstone registry.
  - Returns strictly HTTP 201 with public metadata. Never returns `authCommitment` or `relayAuthKey`.

### 2.2 Public Discovery: `GET /api/rooms/[roomId]`
- **Purpose:** Returns public cryptographic parameters required for client-side unwrap.
- **Response:**
  ```json
  {
    "success": true,
    "room": {
      "roomId": "8f92-c0e4",
      "salt": "base64-salt",
      "wrappedSecretBundle": "base64-bundle",
      "adminPublicKey": "hex-key",
      "state": "WAITING" | "ACTIVE",
      "createdAt": 1732140000000,
      "expiresAt": 1732143600000,
      "accessMode": "with_pass" | "without_pass",
      "requirePass": true | false
    }
  }
  ```
- **Invariants:**
  - `authCommitment` and `relayAuthKey` are strictly purged from output.
  - If room is in `DESTROYING` or `DESTROYED` state, returns HTTP 410 Gone.

### 2.3 Room Termination: `DELETE /api/rooms/[roomId]`
- **Purpose:** Atomically dissolves a room and writes anti-resurrection tombstones.
- **Headers:** `X-Enclave-Admin-Proof: EnclaveAdminProof.<base64UrlPayload>.<signatureHex>`
- **Invariants:**
  - Verifies Ed25519 signature against `room.adminPublicKey`.
  - Verifies canonical payload `DESTROY_ROOM|<roomId>|<ts>|<nonce>`.
  - Consumes nonce in Redis to block replay attacks.
  - Wipes all packets, presence hashes, and media blobs in Redis within an atomic transaction.
  - Sets permanent anti-resurrection tombstone in Redis: `SET enclave:tombstones:<roomId> 1`.

### 2.4 Encrypted Relay: `GET` & `POST /api/rooms/[roomId]/relay`
- **Purpose:** Relays encrypted ciphertext wire packets between participants.
- **Authentication:** `Authorization: Bearer EnclaveToken.<base64UrlPayload>.<hmacHex>`
- **Invariants:**
  - Request method and request pathname are bound to token and verified against server-stored `relayAuthKey`.
  - Timestamp is checked against clock skew ($|\Delta t| < 60$ seconds).
  - Token nonce is consumed atomically in Redis (`SET enclave:nonce:<rid>:<nonce> 1 EX 120 NX`).
  - Wire packets have a hard volatile TTL of 120 seconds.
  - Cleartext `callSignalData` is rejected; all signals must be encrypted inside `payload`.

### 2.5 Encrypted Media Store: `POST` & `GET /api/rooms/[roomId]/media`
- **Purpose:** Blind staging of client-side encrypted images and video clips.
- **Authentication:** Scoped HMAC Relay Token.
- **Validation:**
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`.
  - Max image size: 5 MB. Max video size: 25 MB.
  - Stored purely as blind ciphertext blobs with 1-hour TTL.

### 2.6 View-Once Media Consumption: `POST /api/rooms/[roomId]/media/consume`
- **Purpose:** Atomically wipes a view-once media ciphertext upon first access.
- **Authentication:** Scoped HMAC Relay Token.
- **Invariants:**
  - Executes atomic Redis transaction: `DEL enclave:room:<roomId>:media:<mediaId>`.
  - If already deleted, immediately returns HTTP 410 Gone. Replay is mathematically defeated.

---

## 3. Upstash Redis Schema & Distributed Contract

All Redis keys are partitioned under the `enclave:` namespace:

```
enclave:room:<roomId>                  -> Hash (salt, wrappedBundle, relayAuthKey, adminPublicKey, state, createdAt)
enclave:room:<roomId>:packets          -> List / ZSet (encrypted wire packets, auto-pruned at 120s TTL)
enclave:room:<roomId>:participants     -> Hash (participant records, updated via presence heartbeats)
enclave:room:<roomId>:media:<mediaId>  -> Hash (blind ciphertext, iv, mimeType, size, timestamp)
enclave:nonce:<roomId>:<nonce>         -> String ("1", TTL: 120s, set via NX)
enclave:tombstones:<roomId>            -> String ("1", permanent tombstone)
enclave:ratelimit:<ip>:<action>        -> String (counter, sliding window TTL)
```

### Distributed Consistency & Atomicity
1. **Creation Race Prevention:** Room creation executes `SETNX enclave:room:<roomId>:lock` to guarantee that concurrent creation requests for the same identifier cannot overwrite or corrupt room metadata.
2. **Replay Nonce Consumption:** `SET enclave:nonce:<roomId>:<nonce> 1 EX 120 NX` returns `OK` on first invocation and `null` on all subsequent attempts, defeating token replay across all edge instances.
3. **Atomic Destruction Pipeline:** When a room is destroyed, Redis executes a `MULTI` block deleting the room hash, packet list, participant map, media keys, and writing the tombstone.

---

## 4. Rate Limiting & Edge Proxy Trust Model

- **Trusted Client IP Extraction:**
  - Functions inspect headers in priority order:
    1. `cf-connecting-ip` (Cloudflare Edge)
    2. `x-real-ip` (Vercel Edge Proxy)
    3. `x-forwarded-for` (first untrusted hop parsed with proxy validation)
  - Raw client-supplied headers without edge trust signatures are rejected, defeating header injection attacks (verified by Adversarial Attack 6 in test suite).
- **Thresholds:**
  - Room Creation: 10 attempts per 10 minutes per IP.
  - Media Upload: 20 uploads per minute per room per IP.
  - Relay Polling: 300 requests per minute per participant.
  - Exceeding limits returns HTTP 429 Too Many Requests with `Retry-After` header.
