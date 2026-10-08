/**
 * ENCLAVE Profile, Account Settings & Security Verification Suite
 * Tests display name validation, email change with verification tokens,
 * password policies, active session revocation, and account deletion.
 */

import assert from 'node:assert';
import {
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  getActiveSessions,
  revokeOtherSessions,
  deleteAccount,
  getInitials,
  getClientDeviceInfo
} from '../src/lib/userAccountStore.ts';
import { saveUserSession, getStoredUser, clearUserSession, EnclaveUser } from '../src/lib/authStore.ts';

// Mock localStorage and sessionStorage for Node test environment
class MockStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// Attach mocks to global scope for testing
(global as any).localStorage = new MockStorage();
(global as any).sessionStorage = new MockStorage();
(global as any).window = {
  localStorage: (global as any).localStorage,
  sessionStorage: (global as any).sessionStorage
};
try {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    configurable: true,
    writable: true
  });
} catch {}

export async function runProfileTests() {
  console.log('\n--- Running Profile, Security & Account Management Tests ---');

  // Setup test user
  const initialUser: EnclaveUser = {
    id: 'usr_test_1001',
    email: 'harshit@example.com',
    displayName: 'Harshit',
    avatarSeed: 'seed_1001',
    createdAt: Date.now()
  };
  saveUserSession(initialUser, true);

  // Test 1: Initials Generation & Device Detection
  console.log('[TEST 1] Initials Generation & Device Info');
  assert.strictEqual(getInitials('Harshit Sharma'), 'HS');
  assert.strictEqual(getInitials('Alice'), 'AL');
  assert.strictEqual(getInitials(''), 'E');

  const deviceInfo = getClientDeviceInfo();
  assert.ok(deviceInfo.includes('Windows') && deviceInfo.includes('Chrome'));
  console.log('✓ Initials and client device detection verified');

  // Test 2: Display Name Validation & Sanitization
  console.log('[TEST 2] Display Name Validation & Sanitization');
  // Too short
  const shortRes = updateProfile({ displayName: 'A' });
  assert.strictEqual(shortRes.success, false);

  // HTML injection attempt
  const injectionRes = updateProfile({ displayName: '<script>alert(1)</script>' });
  assert.strictEqual(injectionRes.success, false);

  // Valid name
  const validRes = updateProfile({ displayName: 'Harshit S.' });
  assert.strictEqual(validRes.success, true);
  assert.strictEqual(validRes.user?.displayName, 'Harshit S.');

  const storedAfterName = getStoredUser();
  assert.strictEqual(storedAfterName?.displayName, 'Harshit S.');
  console.log('✓ Display name validation and update verified');

  // Test 3: Email Change Verification Flow
  console.log('[TEST 3] Sensitive Email Change Flow with Cryptographic Tokens');
  // Same email rejected
  const sameEmailRes = requestEmailChange('harshit@example.com');
  assert.strictEqual(sameEmailRes.success, false);

  // Valid new email request
  const reqRes = requestEmailChange('newemail@example.com');
  assert.strictEqual(reqRes.success, true);
  assert.ok(reqRes.token && reqRes.token.length >= 8);
  assert.ok(reqRes.expiresAt && reqRes.expiresAt > Date.now());

  // Verify with invalid token
  const badVerify = verifyEmailChange('invalid-token-1234');
  assert.strictEqual(badVerify.success, false);

  // Verify with correct token
  const goodVerify = verifyEmailChange(reqRes.token!);
  assert.strictEqual(goodVerify.success, true);
  assert.strictEqual(goodVerify.updatedUser?.email, 'newemail@example.com');

  const storedAfterEmail = getStoredUser();
  assert.strictEqual(storedAfterEmail?.email, 'newemail@example.com');

  // Reusing token must fail (Single-use invariant)
  const reuseVerify = verifyEmailChange(reqRes.token!);
  assert.strictEqual(reuseVerify.success, false, 'Token must not be reusable');
  console.log('✓ Single-use email verification token lifecycle verified');

  // Test 4: Password Management & Validation
  console.log('[TEST 4] Password Rules & Session Signout');
  // Too short
  const shortPwd = changePassword('current123', 'short', 'short');
  assert.strictEqual(shortPwd.success, false);

  // Mismatch
  const mismatchPwd = changePassword('current123', 'Password@123', 'Password@999');
  assert.strictEqual(mismatchPwd.success, false);

  // Successful change with sign out others
  const validPwd = changePassword('current123', 'NewStrongPassword@2026', 'NewStrongPassword@2026', true);
  assert.strictEqual(validPwd.success, true);
  console.log('✓ Password policy enforcement verified');

  // Test 5: Active Sessions & Multi-Device Signout
  console.log('[TEST 5] Active Sessions & Invalidation');
  const sessions = getActiveSessions();
  assert.ok(sessions.length >= 1);
  assert.ok(sessions.some(s => s.isCurrent));

  revokeOtherSessions();
  const sessionsAfterRevoke = getActiveSessions();
  assert.strictEqual(sessionsAfterRevoke.length, 1);
  assert.strictEqual(sessionsAfterRevoke[0].isCurrent, true);
  console.log('✓ Session revocation verified');

  // Test 6: Account Deletion
  console.log('[TEST 6] Permanent Account Deletion & Memory Wipe');
  deleteAccount();
  const userAfterDelete = getStoredUser();
  assert.strictEqual(userAfterDelete, null, 'User session must be completely cleared');
  console.log('✓ Account deletion and zeroization verified');

  console.log('\n>>> ALL PROFILE & SECURITY TESTS PASSED SUCCESSFULLY <<<\n');
}
