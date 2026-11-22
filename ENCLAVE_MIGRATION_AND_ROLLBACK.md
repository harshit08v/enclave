# ENCLAVE — Migration, Rollback & Operational Deployment Guide
**Document Status:** Operational Runbook  
**Target Environment:** Vercel Production (`https://enclave.vercel.app`)  
**Baseline Git Commit:** `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`  
**Target Git Branch:** `main`  

---

## 1. Overview & Operational Principles

ENCLAVE is engineered to be **stateless across deploys**. Because all room state, packets, and presence heartbeats exist purely in volatile memory (Upstash Redis) with bounded TTLs (max 1 hour for rooms, 120 seconds for packets), zero persistent schema migrations are required for deployments.

### Guiding Principles
- **Never Force Push:** All deployments are traceable via signed Git commits.
- **Fail-Closed Verification:** Production environments must verify Redis connectivity prior to accepting traffic.
- **Instant Rollback Availability:** Every production build on Vercel retains an immutable deployment artifact that can be rolled back in $<10$ seconds.

---

## 2. Pre-Deployment Verification Checklist

Before promoting any release to production:
1. **Automated Test Battery:** Run `npm test`. All 17 test suites must pass 100%.
2. **TypeScript Compilation:** Run `npx tsc --noEmit`. Must exit with 0 errors.
3. **Turbopack Production Build:** Run `npm run build`. Must compile all 57 routes successfully.
4. **Environment Variables Check:**
   - `UPSTASH_REDIS_REST_URL`: Configured and reachable.
   - `UPSTASH_REDIS_REST_TOKEN`: Active token with Read/Write permissions.
   - `ENCLAVE_ADMIN_PASSWORD`: High-entropy administrative secret ($>32$ chars).
   - `NEXT_PUBLIC_FIREBASE_*`: Valid Firebase client credentials.
   - `FIREBASE_ADMIN_*`: Valid Firebase Admin SDK credentials.
   - `BREVO_API_KEY`: Active Brevo transactional email API key.

---

## 3. Zero-Downtime Deployment Procedure

### Step 1: Create Isolated Release Branch
```bash
git checkout -b release/v2.0.0-security-hardening
git add .
git commit -m "feat(security): complete cryptographic re-architecture, backend hardening & editorial UI redesign"
```

### Step 2: Push to Origin for Preview Build
```bash
git push -u origin release/v2.0.0-security-hardening
```
- Vercel automatically compiles a Preview Deployment.
- Inspect the build logs to confirm zero warnings or errors.

### Step 3: Run Smoke Verification on Preview Environment
1. Create a passwordless room (`#k=...`). Verify URL fragment scrubbing and unwrap.
2. Create a passphrase-protected room. Verify Argon2id key derivation and chat relay.
3. Test a WebRTC voice call. Confirm encrypted signaling exchange.
4. Test room destruction. Confirm Ed25519 admin signature verification and instant chamber tombstoning.

### Step 4: Promote to Production
- Merge `release/v2.0.0-security-hardening` into `main` via PR.
- Vercel automatically deploys to `https://enclave.vercel.app`.

---

## 4. Disaster Recovery & Rollback Plan

If unexpected regressions, edge proxy incompatibilities, or client errors occur post-deployment:

### Immediate Action: Instant Vercel Rollback (<15 seconds)
1. Open the Vercel Dashboard for project `enclave`.
2. Navigate to **Deployments**.
3. Locate the previous stable deployment corresponding to commit `c7e74b207a6f62b5d5fe46ed5f77526408e353fe`.
4. Click the three dots (`...`) $\rightarrow$ **Promote to Production** (or **Instant Rollback**).
5. Vercel instantly routes edge DNS and CDN traffic back to the previous deployment artifact.

### CLI Rollback (Alternative)
```bash
npx vercel rollback
```

### Redis State Handling
Because Redis keys are ephemeral:
- Active rooms from v2.0 will naturally expire within their 1-hour TTL.
- Nonce keys (`enclave:nonce:*`) have a 120-second TTL and require zero manual cleanup.
- If an immediate state purge is required by the operator:
  ```bash
  # Optional: Flush active room keys without affecting persistent account registries
  redis-cli --scan --pattern "enclave:room:*" | xargs redis-cli del
  ```

---

## 5. Post-Rollback Health Checklist
- [ ] Verify `GET /api/admin/health` returns `status: "healthy"`.
- [ ] Confirm room creation operates normally.
- [ ] Inspect error telemetry in Vercel Analytics for elevated 5xx status codes.
