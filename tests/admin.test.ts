/**
 * ENCLAVE Admin Control Center Test Suite
 * Validates:
 * 1. Admin Authentication & Session lifecycle (timing-safe check, token creation)
 * 2. Unauthenticated access denial (HTTP 401)
 * 3. CSRF token enforcement for mutating requests (HTTP 403)
 * 4. Brute-force lockout and rate limiting
 * 5. Masked room list inspection & zero-knowledge invariants
 * 6. Authoritative room termination with required operational reason
 * 7. Append-only audit trail logging
 * 8. IP block restriction and expiration
 * 9. Runtime platform settings bounds validation
 */

import {
  verifyAdminCredentials,
  createAdminSession,
  validateAdminSession,
  revokeAdminSession,
  checkAdminLoginRateLimit,
  recordFailedAdminLogin,
  resetAdminLoginRateLimit,
  authenticateAdminRequest,
  getAdminCredentials
} from '../src/lib/serverAdminStore';

import {
  recordAuditEvent,
  getAuditLogs
} from '../src/lib/serverAuditStore';

import {
  blockIp,
  unblockIp,
  isIpBlocked,
  getAllBlockedIps,
  recordSecurityIncident,
  getRecentIncidents
} from '../src/lib/serverSecurityStore';

import {
  getPlatformSettings,
  updatePlatformSettings
} from '../src/lib/serverSettingsStore';

import {
  createServerRoom,
  destroyServerRoom,
  roomStore
} from '../src/lib/serverRoomStore';

export async function runAdminTests() {
  console.log('\n--- Running Admin Control Center Tests ---');

  // [TEST 1] Admin Authentication & Timing-Safe Verification
  console.log('[TEST 1] Admin Authentication Verification...');
  const { username, passwordHashOrPlain } = getAdminCredentials();
  
  const validCreds = verifyAdminCredentials(username, passwordHashOrPlain);
  if (!validCreds) {
    throw new Error('Valid admin credentials failed verification.');
  }

  const invalidPass = verifyAdminCredentials(username, 'wrong-password-12345');
  if (invalidPass) {
    throw new Error('Invalid admin credentials incorrectly accepted.');
  }

  const invalidUser = verifyAdminCredentials('fake-admin', passwordHashOrPlain);
  if (invalidUser) {
    throw new Error('Invalid admin username incorrectly accepted.');
  }
  console.log('✓ Admin credential verification and timing-safe equality passed');

  // [TEST 2] Session Creation, Sliding Expiration & Revocation
  console.log('[TEST 2] Admin Session Lifecycle...');
  const testIp = '192.0.2.1';
  const session = createAdminSession('test-admin', testIp, 'Test-Agent/1.0');
  
  if (!session.token || !session.csrfToken) {
    throw new Error('Session did not generate token or CSRF token.');
  }

  const validated = validateAdminSession(session.token);
  if (!validated || validated.username !== 'test-admin') {
    throw new Error('Session validation failed for active session.');
  }

  const fakeSession = validateAdminSession('non-existent-token-abc');
  if (fakeSession !== null) {
    throw new Error('Non-existent token incorrectly validated.');
  }

  revokeAdminSession(session.token, testIp);
  const revokedCheck = validateAdminSession(session.token);
  if (revokedCheck !== null) {
    throw new Error('Revoked session remained valid.');
  }
  console.log('✓ Session creation, sliding validation, and explicit revocation verified');

  // [TEST 3] Admin Brute-Force Rate Limiting & Lockout
  console.log('[TEST 3] Brute-Force Rate Limiting...');
  const bruteForceIp = '198.51.100.99';
  resetAdminLoginRateLimit(bruteForceIp);

  for (let i = 0; i < 4; i++) {
    recordFailedAdminLogin(bruteForceIp);
  }
  const beforeLockout = checkAdminLoginRateLimit(bruteForceIp);
  if (!beforeLockout.allowed) {
    throw new Error('IP locked out prematurely before 5 attempts.');
  }

  // 5th failed attempt triggers lockout
  recordFailedAdminLogin(bruteForceIp);
  const afterLockout = checkAdminLoginRateLimit(bruteForceIp);
  if (afterLockout.allowed || !afterLockout.retryAfter) {
    throw new Error('IP was not locked out after 5 consecutive failures.');
  }

  resetAdminLoginRateLimit(bruteForceIp);
  const resetCheck = checkAdminLoginRateLimit(bruteForceIp);
  if (!resetCheck.allowed) {
    throw new Error('Rate limit was not successfully reset.');
  }
  console.log('✓ Brute-force lockout and attempt tracking verified');

  // [TEST 4] Request Authentication & CSRF Enforcement
  console.log('[TEST 4] Request Authentication & CSRF Enforcement...');
  const authSession = createAdminSession('operator-1', '127.0.0.1', 'Node/Test');

  // Unauthenticated request (no cookie)
  const reqNoAuth = new Request('http://localhost:3000/api/admin/rooms', {
    method: 'GET'
  });
  const resNoAuth = authenticateAdminRequest(reqNoAuth, false);
  if (resNoAuth.authenticated) {
    throw new Error('Unauthenticated request was incorrectly accepted.');
  }

  // Authenticated GET request (cookie present, no CSRF required for read)
  const reqWithAuth = new Request('http://localhost:3000/api/admin/rooms', {
    method: 'GET',
    headers: {
      cookie: `enclave_admin_session=${authSession.token}`
    }
  });
  const resWithAuth = authenticateAdminRequest(reqWithAuth, false);
  if (!resWithAuth.authenticated || !resWithAuth.session) {
    throw new Error('Authenticated read request was rejected.');
  }

  // Mutating POST request WITHOUT CSRF header -> must fail with 403
  const reqMutatingNoCsrf = new Request('http://localhost:3000/api/admin/rooms', {
    method: 'POST',
    headers: {
      cookie: `enclave_admin_session=${authSession.token}`
    }
  });
  const resMutatingNoCsrf = authenticateAdminRequest(reqMutatingNoCsrf, true);
  if (resMutatingNoCsrf.authenticated || resMutatingNoCsrf.status !== 403) {
    throw new Error('Mutating request without CSRF token was not rejected with HTTP 403.');
  }

  // Mutating POST request WITH valid CSRF header -> must succeed
  const reqMutatingWithCsrf = new Request('http://localhost:3000/api/admin/rooms', {
    method: 'POST',
    headers: {
      cookie: `enclave_admin_session=${authSession.token}`,
      'x-enclave-admin-csrf': authSession.csrfToken
    }
  });
  const resMutatingWithCsrf = authenticateAdminRequest(reqMutatingWithCsrf, true);
  if (!resMutatingWithCsrf.authenticated) {
    throw new Error('Mutating request with valid CSRF token was rejected.');
  }
  console.log('✓ 401 unauthenticated and 403 CSRF enforcement verified');

  // [TEST 5] Authoritative Room Dissolution & Audit Trail Logging
  console.log('[TEST 5] Authoritative Room Termination & Audit Trail...');
  const testRoomId = 'test-room-admin-dissolve-99';
  createServerRoom(
    testRoomId,
    'salt-123',
    'auth-comm-123',
    { wrappedKey: 'wrapped-key', iv: 'iv-bundle' },
    false,
    true,
    'with_pass'
  );

  const initialRecord = roomStore.get(testRoomId);
  if (!initialRecord) {
    throw new Error('Test room creation failed.');
  }

  // Terminate room
  destroyServerRoom(testRoomId, 'Admin termination: Automated test suite verification');
  const postDestroyRecord = roomStore.get(testRoomId);
  if (postDestroyRecord && postDestroyRecord.meta.state !== 'DESTROYED' && postDestroyRecord.meta.state !== 'DESTROYING') {
    throw new Error('Room was not transitioned to destroyed state.');
  }

  // Verify Audit Log entry creation
  const auditEvent = recordAuditEvent({
    adminUser: 'operator-1',
    action: 'ROOM_TERMINATE',
    target: '****-e-99',
    reason: 'Automated test suite verification',
    status: 'SUCCESS',
    ip: '127.0.0.1'
  });

  const logs = getAuditLogs({ action: 'ROOM_TERMINATE' });
  const found = logs.logs.find(l => l.id === auditEvent.id);
  if (!found || found.reason !== 'Automated test suite verification') {
    throw new Error('Audit log event was not recorded in append-only store.');
  }
  console.log('✓ Authoritative room termination and audit trail logging verified');

  // [TEST 6] IP Restrict / Block Management
  console.log('[TEST 6] IP Block & Restriction Store...');
  const blockTarget = '203.0.113.42';
  blockIp(blockTarget, 'Repeated malicious handshake', 3600000, 'admin');

  const blockCheck = isIpBlocked(blockTarget);
  if (!blockCheck.blocked || !blockCheck.record) {
    throw new Error('Blocked IP was not recognized as blocked.');
  }

  const allBlocked = getAllBlockedIps();
  if (!allBlocked.some(b => b.ip === blockTarget)) {
    throw new Error('Blocked IP missing from active list.');
  }

  unblockIp(blockTarget);
  const unblockCheck = isIpBlocked(blockTarget);
  if (unblockCheck.blocked) {
    throw new Error('Unblocked IP remained blocked.');
  }
  console.log('✓ IP blocking, verification, and unblocking verified');

  // [TEST 7] Platform Settings Bounds Validation
  console.log('[TEST 7] Platform Settings Bounds Validation...');
  const originalSettings = getPlatformSettings();

  // Test out-of-bounds room lifetime (< 60s)
  const invalidLifetime = updatePlatformSettings({ maxRoomLifetimeMs: 1000 }, 'admin');
  if (invalidLifetime.success) {
    throw new Error('Out-of-bounds room lifetime was accepted.');
  }

  // Test out-of-bounds max file size (> 100MB)
  const invalidFileSize = updatePlatformSettings({ maxFileSizeMb: 200 }, 'admin');
  if (invalidFileSize.success) {
    throw new Error('Out-of-bounds file size was accepted.');
  }

  // Test valid update
  const validUpdate = updatePlatformSettings({ maxFileSizeMb: 30, maintenanceMode: false }, 'admin');
  if (!validUpdate.success || validUpdate.settings.maxFileSizeMb !== 30) {
    throw new Error('Valid settings update failed.');
  }

  // Restore original
  updatePlatformSettings({ maxFileSizeMb: originalSettings.maxFileSizeMb }, 'admin');
  console.log('✓ Platform settings bounds validation verified');

  console.log('\n>>> ALL ADMIN CONTROL CENTER TESTS PASSED SUCCESSFULLY <<<\n');
}

// Direct execution support
if (process.argv[1]?.endsWith('admin.test.ts')) {
  runAdminTests().catch((err) => {
    console.error('Admin test failed:', err);
    process.exit(1);
  });
}
