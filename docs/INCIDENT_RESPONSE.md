# ENCLAVE Incident Response & Key Compromise Plan

## 1. Overview
This document outlines the standard operating procedures and response workflows for security anomalies, potential key compromises, denial-of-service attempts, and cryptographic deprecations within the ENCLAVE infrastructure.

---

## 2. Severity Classification Matrix

| Severity Level | Definition | Examples | SLA / Response Time |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Cryptographic break, zero-day in WebCrypto, server plaintext leak, or active MITM | Plaintext found in server logs; WebCrypto vulnerability allowing key recovery | Immediate (< 1 hour) |
| **SEV-2 (High)** | Rate limiting bypass, room resurrection flaw, or replay vulnerability | Replayed packets accepted by client; rate limiter bypass allowing brute-force | < 4 hours |
| **SEV-3 (Medium)** | Information disclosure, metadata leakage, or edge-case state machine race | Room participant count desync; timing difference in token evaluation | < 24 hours |
| **SEV-4 (Low)** | Minor UX ambiguity, non-security logging verbosity | Verbose client console warnings; cosmetic UI glitch | < 72 hours |

---

## 3. Incident Scenarios & Response Procedures

### Scenario A: Room Access Pass Compromise
1. **User Action**: The user should immediately click **"Leave Room"** or use the room info modal to trigger **"Obliterate Room"**.
2. **System Response**:
   - The coordinator broadcasts a `room_destruction_triggered` packet across all active endpoints.
   - The server immediately marks the room `DESTROYED` and drops all routing entries.
   - All participant endpoints zeroize in-memory secrets and redirect to the console.
3. **Recovery**: The user creates a brand new Enclave room with a fresh Diceware passphrase and distributes it over an uncompromised channel.

### Scenario B: Suspected Server Infrastructure Compromise
1. **Assessment**:
   - Verify that all cryptographic keys and plaintexts were generated and retained exclusively on client endpoints.
   - Confirm that the compromised server only held public salts, auth commitments, and encrypted wire packets.
2. **Containment**:
   - Invalidate all active room routing maps in memory.
   - Rotate server TLS certificates and deployment credentials.
   - Deploy a verified build of the application.
3. **Communication**:
   - Notify users that because ENCLAVE operates on zero-knowledge E2EE architecture, message plaintext was not accessible to the compromised server.

### Scenario C: Automated Brute-Force Detection
1. **Detection**:
   - Server-side sliding-window monitor detects > 5 failed verification attempts within 5 minutes against a single IP or room identifier.
2. **Action**:
   - Issue HTTP 429 Too Many Requests with a mandatory 5-minute lockout timer.
   - If the attack persists across distributed IPs, the target room record can be placed in emergency rate-limit quarantine.

---

## 4. Post-Incident Review (PIR)
Following every SEV-1 or SEV-2 incident, a formal Post-Incident Review must be conducted within 48 hours to:
1. Identify the root cause.
2. Formulate automated regression tests (to be added to `tests/adversarial.test.ts`).
3. Update `docs/SECURITY_AUDIT.md` and threat models accordingly.
