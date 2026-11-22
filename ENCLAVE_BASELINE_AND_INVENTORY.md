# ENCLAVE — Comprehensive Baseline, Architecture & Vulnerability Inventory

**Audit Date**: 2026-11-20  
**Repository**: https://github.com/harshit08v/enclave  
**Reference Baseline Commit**: `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`  
**Current Branch**: `main`  
**Working Tree State**: Clean tracked files; untracked prototype files in `tests/prototype/` (`doubleRatchetPrototype.ts`, `verifyDoubleRatchet.test.ts`).  
**Auditor**: Principal Security Engineer, Cryptographic Protocol Engineer, Senior Next.js Architect.

---

## 1. Executive Summary

This inventory establishes the technical baseline of the ENCLAVE project prior to executing the comprehensive security hardening, cryptographic re-architecture, backend modernization, and premium UI/UX rebuild.

The project currently functions as an ephemeral, browser-based messaging and calling platform using Next.js 16 (App Router), React 19, Tailwind CSS v4, WebCrypto Subtle API, and Argon2id. A comprehensive automated test suite of 15 suites exists and currently passes under `npx tsx tests/runAllTests.ts`, and the Next.js production build (`next build`) compiles 57 routes cleanly.

However, an in-depth security and architectural audit revealed severe vulnerabilities across authorization boundaries, key management, signaling secrecy, and frontend architecture that must be remediated in strict sequence.

---

## 2. Environment & Dependency Inventory

### 2.1 Core Runtime & Frameworks
| Dependency | Version in `package.json` | Installed / Actual Version | Notes |
| :--- | :--- | :--- | :--- |
| `next` | `16.3.8` | Next.js 16.3.8 (Turbopack) | App Router with dynamic & static route handlers |
| `react` | `19.2.8` | React 19.2.8 | Strict hooks rules, hook purity checks active |
| `react-dom` | `19.2.8` | React DOM 19.2.8 | |
| `typescript` | `^5.8.2` | TypeScript 5.8.2 | Type checks pass with `tsc --noEmit` |
| `tailwindcss` | `^4` | Tailwind CSS v4 (`@tailwindcss/postcss`) | CSS-first configuration via `@import "tailwindcss"` |
| `hash-wasm` | `^4.12.0` | Argon2id WebAssembly engine | Used for memory-hard KDF ($m=32\text{MB}, t=3, p=1$) |
| `firebase` | `^13.0.0` | Firebase Client SDK | Google OAuth, email verification, tokens |
| `firebase-admin`| `^14.5.0` | Firebase Admin SDK | Server-side token verification |
| `three` | `^0.170.0` | Three.js | 3D visual canvas (hero section) |
| `lucide-react` | `^1.16.0` | Lucide Icons | System UI icons |

### 2.2 Development & Build Tools
- Node.js: `v24.18.0`
- OS: Windows (PowerShell environment)
- ESLint: `eslint` v9 with `eslint-config-next 16.3.8` (currently reports 55 errors, 125 warnings due to React 19 hook purity rules)
- Prototype Directory: `tests/prototype/` containing an isolated Double Ratchet prototype (`doubleRatchetPrototype.ts`) and test suite (`verifyDoubleRatchet.test.ts`).

---

## 3. Current Architecture & Application Functionality

### 3.1 Routing & Application Structure
- **Public Marketing Website**:
  - `/`: Hero, product positioning, 3D interactive graphics, feature cards, FAQ.
  - `/about`, `/contact`, `/faq`, `/how-it-works`, `/security`, `/services`, `/locations`: Informational marketing pages.
  - `/legal/*`: 11 legal pages (privacy, terms, acceptable use, data retention, security disclosure, etc.) + `/legal` hub.
- **Account & Authentication**:
  - `/login`: Password login and Google sign-in.
  - `/signup`: Account registration with Argon2id client hashing and email verification trigger.
  - `/reset-password`: Single-use CSPRNG token password reset.
  - `/verify-email`: Token verification for account activation.
  - `/app`: User dashboard showing active sessions and quick entry.
  - `/app/profile`: User settings, display name, password update, session revocation.
  - `/app/new`: Room creation flow (password-protected vs. link-access).
- **Ephemeral Rooms**:
  - `/r/[roomId]`: The real-time messaging, calling, media sharing, and room control interface.
- **Administration**:
  - `/admin`: Administrative dashboard with sub-routes `/admin/users`, `/admin/rooms`, `/admin/security`, `/admin/audit`, `/admin/health`, `/admin/settings`.

### 3.2 Current Backend & Storage Architecture
- **Room Store Hierarchy (`src/lib/serverRoomStore.ts`, `src/lib/serverRoomAdapter.ts`)**:
  - `IRoomStoreAdapter`: Common contract for room lifecycle, presence, packet relay, segregated media, and rate limits.
  - `InMemoryRoomStoreAdapter`: Process-local `Map` storage used for development and local testing.
  - `DistributedRoomStoreAdapter`: Redis / Upstash REST implementation utilizing atomic Lua scripts (`LUA_UPDATE_PRESENCE`, `LUA_PUSH_PACKET`, `LUA_DELETE_ROOM`, `LUA_CHECK_RATE_LIMIT`).
  - Production Fail-Closed Guard: Throws error if `NODE_ENV === 'production'` and Redis credentials are missing.
- **Packet Relay (`POST /api/rooms/[roomId]/relay`, `GET /api/rooms/[roomId]/relay`)**:
  - Client polls via HTTP long-polling with cursor-based pagination.
  - In-browser cross-tab sync via `BroadcastChannel('enclave_room_${roomId}')`.
- **Media Architecture (`/api/rooms/[roomId]/media`)**:
  - Media encrypted client-side using AES-256-GCM.
  - Base64 ciphertext uploaded directly through the Next.js API route into server storage/Redis.

---

## 4. Security Findings & Vulnerability Matrix

| ID | Severity | Category | Vulnerability Description | Location | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | **CRITICAL** | Authorization | **`authCommitment` Public Leakage**: The room authorization commitment is returned in public `GET /api/rooms/[roomId]` response. Any unauthenticated caller can extract the credential and destroy rooms or read/write packets. | `src/app/api/rooms/[roomId]/route.ts#L55` | Remove `authCommitment` from all public GET endpoints. Strictly separate public room metadata from authorization verification material. |
| **VULN-02** | **CRITICAL** | Cryptography / Auth | **Flawed Relay Authorization**: The server verifies participant requests by directly comparing the provided commitment against `record.meta.authCommitment`. Does not provide request binding, path binding, expiration, replay nonces, or directional authentication. | `src/lib/serverRoomStore.ts#L150-177` | Implement mathematically valid relay authorization tokens with room binding, timestamp freshness, single-use/sliding replay protection, and HMAC/signature verification with distinct keys. |
| **VULN-03** | **CRITICAL** | Authorization | **Unauthenticated Room Destruction & Missing Admin Identity**: Room destruction only checks if the caller possesses `authProof` or trusts client-supplied `creatorId`. Any room participant can destroy the room. | `src/app/api/rooms/[roomId]/route.ts#L93-97` | Implement asymmetric administrator proof (Ed25519 signing key generated at creation, public key bound to room record; destruction requires cryptographically signed request). |
| **VULN-04** | **CRITICAL** | Key Management | **Deterministic Open-Access Secrets**: `getOpenAccessPassphrase(roomId)` derives keys from `enclave-open-access-${roomId}`. Anyone knowing the public `roomId` can decrypt room messages. | `packages/crypto/index.ts#L828`, `src/app/app/new/page.tsx#L222` | Obliterate `getOpenAccessPassphrase`. Generate client-side 256-bit CSPRNG secret encoded in URL fragment (`/r/[roomId]#k=[secret]`), never sent over HTTP. |
| **VULN-05** | **CRITICAL** | Protocol Secrecy | **Plaintext WebRTC Signaling Leakage**: In `src/lib/roomRelay.ts`, `callSignalData` (SDP offers, answers, ICE candidates) is attached unencrypted to `WirePacket.callSignalData` and consumed directly by peers without decryption. | `src/lib/roomRelay.ts#L1143`, `src/lib/roomRelay.ts#L375`, `packages/protocol/index.ts#L87` | Eliminate `callSignalData` cleartext field completely. Encrypt and authenticate all WebRTC signaling inside encrypted payload envelope with canonical AAD. |
| **VULN-06** | **HIGH** | Cryptography | **Production Software AES-GCM Fallback**: `packages/crypto/subtleEngine.ts` implements a custom pure-JS AES-GCM cipher with software GHASH and CTR mode, which is vulnerable to CPU cache timing attacks. | `packages/crypto/subtleEngine.ts`, `packages/crypto/index.ts` | Remove software AES fallback from production code paths. Require native WebCrypto SubtleCrypto; fail closed if secure cryptographic hardware/API is missing. |
| **VULN-07** | **HIGH** | Media Architecture | **Base64 Serverless Media Payloads**: Encrypted media (up to 50MB) is sent as Base64 strings through Next.js serverless functions into Redis, causing memory spikes and high latency. | `src/app/api/rooms/[roomId]/media/route.ts` | Design direct-to-storage signed pre-upload URLs (S3/R2 compatible) with client-side encryption and strict scoped expiration. |
| **VULN-08** | **HIGH** | Transport Security | **Permissive CSP Headers**: `next.config.ts` includes `'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'` without strict origin controls or per-request nonces. | `next.config.ts#L33` | Harden Content Security Policy, HSTS, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. |
| **VULN-09** | **HIGH** | Cryptography | **Lack of Forward Secrecy / Ratchet in Active Chat**: The production chat currently uses a single symmetric session key per room/sender without ratcheting message keys. | `src/lib/roomRelay.ts`, `packages/crypto/index.ts` | Re-architect cryptographic session layer using Double Ratchet with Ed25519 identity, X25519 DH ratchet, and symmetric KDF chains. |

---

## 5. Frontend & UI/UX Technical Debt

1. **Monolithic Room Component**:
   `src/app/r/[roomId]/page.tsx` spans 2,135 lines and manages:
   - WebRTC connection state and audio playback.
   - Cryptographic derivation and key wrapping.
   - Message list rendering and composition.
   - Presence polling and network reconnects.
   - Multiple modal dialogs and settings drawers.
   - Media encryption, recording, and preview.
   - *Requirement*: Decompose into modular components (`RoomHeader`, `MessageList`, `MessageBubble`, `ChatInputBar`, `ActiveCallHUD`, `SafetyVerificationDrawer`, `MediaPreview`, `RoomSettings`) and decoupled custom hooks (`useRoomCrypto`, `useRoomRelay`, `useWebRTCCall`, `useEphemeralTimers`).

2. **Visual Design System**:
   - Current aesthetic mixes generic dark cards, floating glow elements, and inconsistent typography.
   - Needs transformation into the specified **EDITORIAL PRIVACY** design system:
     - Disciplined palette: Forest green (`#174A3A`), Brass (`#C5A880` / `#D4AF37`), warm canvas (`#FAFAF8` / `#0E1412`), refined surface borders (`#E5E0D8` / `#283630`).
     - Typography: Newsreader for display editorial headings, Geist Sans for UI/body, Geist Mono for cryptographic digests/metadata.
     - Restrained, tactile, calm, and authoritative interface.

3. **Lint & Code Quality**:
   - 55 ESLint errors and 125 warnings to resolve, specifically React 19 hook purity issues (synchronous `setState` in `useEffect`, `Date.now()` during render).

---

## 6. Current Test & Build Verification

- **Automated Tests**:
  - `npx tsx tests/runAllTests.ts`: **15 / 15 suites pass (100%)**.
  - `tests/prototype/verifyDoubleRatchet.test.ts`: **8 / 8 Double Ratchet invariants pass**.
- **TypeScript**:
  - `npx tsc --noEmit`: **0 errors**.
- **Next.js Production Build**:
  - `npm run build`: **Compiles successfully across all 57 routes**.

---

## 7. Implementation Roadmap & Phase Gate Sequencing

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: Baseline & Preservation Inventory (COMPLETE)       │
│ - Verified git status, branch main, reference commit c7e74b2│
│ - Inventoried dependencies, architecture, tests, and debt   │
│ - Delivered ENCLAVE_BASELINE_AND_INVENTORY.md               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 1: Critical Security Remediation                      │
│ 1. Obliterate authCommitment from GET /api/rooms/[roomId]   │
│ 2. Correct relay authorization (valid scoped token design)  │
│ 3. Authenticate creator admin permissions (Ed25519 sign)   │
│ 4. Obliterate getOpenAccessPassphrase & implement #k= secret│
│ 5. Encrypt WebRTC signaling end-to-end (purge callSignalData)│
│ 6. Enforce native WebCrypto; fail closed on software ciphers│
│ 7. Audit & harden HTTP security headers                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 2: Cryptographic Re-Architecture                     │
│ 1. Asymmetric Identity & Device Architecture (Ed25519)      │
│ 2. Authenticated Handshake & Key Agreement (X25519)         │
│ 3. Double Ratchet Protocol implementation in production      │
│ 4. Group session key distribution & rotation                │
│ 5. Safety numbers & QR comparison                           │
│ 6. Acceptance test suite with published test vectors        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 3: Backend & Infrastructure Modernization              │
│ 1. Redis atomic state machine & destruction race protection │
│ 2. Packet consistency, monotonic sequencing, replay defeat  │
│ 3. Direct encrypted media upload architecture               │
│ 4. Distributed rate limiting & IP extraction hardening     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 4: Frontend Architecture Refactoring                  │
│ 1. Decompose src/app/r/[roomId]/page.tsx (2135 lines)       │
│ 2. Modular hooks: useRoomCrypto, useRoomRelay, useWebRTC    │
│ 3. Isolate WebRTC lifecycle, prevent stale closures & leaks │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 5: Complete Editorial Privacy UI/UX Redesign          │
│ 1. Brand design tokens (Forest, Brass, Canvas, Surface)     │
│ 2. Typography system (Newsreader + Geist Sans + Geist Mono)  │
│ 3. Public website redesign (Home, About, Security, Legal)   │
│ 4. Room creation, authentication & dashboard redesign       │
│ 5. Chat room, Call HUD, Safety Drawer, Media Lightbox UI    │
│ 6. Mobile responsiveness (100dvh, keyboard, safe areas)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 6 & 7: Independent Verification & Release Preparation │
│ 1. Security regression test suite                           │
│ 2. Cryptographic acceptance tests                           │
│ 3. Accessibility & responsive audits (WCAG 2.1 AA)          │
│ 4. Deliver complete documentation suite (Docs 1-10)         │
│ 5. Final build & test verification                          │
└─────────────────────────────────────────────────────────────┘
```

The baseline inventory is complete and frozen. Phase 1 implementation begins immediately.
