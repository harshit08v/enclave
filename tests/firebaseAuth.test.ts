/**
 * ENCLAVE Firebase Authentication & Server Authorization Test Suite
 * Tests:
 * 1. Firebase Client Configuration and Error Mapping
 * 2. Token Verification Logic (mocked/test mode)
 * 3. Email Verification Gatekeeping (Verified vs Unverified email/password accounts)
 * 4. Google Sign-In Account Verification (automatically email_verified: true)
 * 5. Server API Enforcement (/api/rooms rejects unverified users with 403)
 * 6. Guest Room Access Preservation (anonymous users can still create rooms)
 * 7. Admin Control Center Isolation (Firebase credentials never grant admin access)
 */

import { strict as assert } from 'node:assert';
import { verifyFirebaseIdToken, authenticateServerRequest, authorizeRoomCreation } from '../src/lib/serverAuth.ts';
import { mapFirebaseError } from '../src/lib/firebaseClient.ts';

export async function runFirebaseAuthTests() {
  console.log('\n--- Running Firebase Authentication & Security Tests ---');
  process.env.NODE_ENV = 'test';

  // 1. Error mapping tests
  console.log('Test 1: Firebase Auth Error Mapping');
  assert.equal(
    mapFirebaseError({ code: 'auth/user-not-found' }),
    'No account found with this email. Create an account to continue.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/wrong-password' }),
    'Incorrect password. Please try again.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/invalid-credential' }),
    'Invalid email address or password. Please verify your credentials.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/invalid-email' }),
    'Please enter a valid email address.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/missing-password' }),
    'Please enter both your email and password.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/too-many-requests' }),
    'Access temporarily restricted due to many failed attempts. Please try again later.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/network-request-failed' }),
    'Unable to connect. Please check your internet connection and try again.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/popup-closed-by-user' }),
    'Google sign-in popup was closed before completion.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/email-already-in-use' }),
    'An account with this email address already exists. Please sign in instead.'
  );
  assert.equal(
    mapFirebaseError({ code: 'auth/internal-error' }),
    'Authentication service encountered an internal error. Please ensure popups and third-party storage are allowed, or try again.'
  );
  assert.equal(
    mapFirebaseError({
      code: 'auth/internal-error',
      customData: { _tokenResponse: { error: { message: 'CONFIGURATION_NOT_FOUND' } } }
    }),
    'Authentication service error (CONFIGURATION_NOT_FOUND). Please try again or check browser settings.'
  );
  console.log('  ✔ Firebase error codes cleanly mapped to human-readable strings');

  // 2. Token verification - Unverified Password Account
  console.log('Test 2: Server Verification of Unverified Password Account');
  const unverifiedToken = 'test_firebase_token_unverified_usr01_pwd';
  const unverifiedRes = await verifyFirebaseIdToken(unverifiedToken);
  assert.equal(unverifiedRes.success, true);
  assert.equal(unverifiedRes.decoded?.email_verified, false);
  assert.equal(unverifiedRes.decoded?.uid, 'usr01');

  const unverifiedServerAuth = await authenticateServerRequest(
    new Request('http://localhost:3000/api/rooms', {
      headers: { Authorization: `Bearer ${unverifiedToken}` }
    })
  );
  assert.equal(unverifiedServerAuth.authenticated, true);
  assert.equal(unverifiedServerAuth.isVerified, false);
  console.log('  ✔ Unverified user properly identified as isVerified: false');

  // 3. Token verification - Verified Password Account
  console.log('Test 3: Server Verification of Verified Password Account');
  const verifiedToken = 'test_firebase_token_verified_usr02_pwd';
  const verifiedRes = await verifyFirebaseIdToken(verifiedToken);
  assert.equal(verifiedRes.success, true);
  assert.equal(verifiedRes.decoded?.email_verified, true);
  assert.equal(verifiedRes.decoded?.uid, 'usr02');

  const verifiedServerAuth = await authenticateServerRequest(
    new Request('http://localhost:3000/api/rooms', {
      headers: { Authorization: `Bearer ${verifiedToken}` }
    })
  );
  assert.equal(verifiedServerAuth.authenticated, true);
  assert.equal(verifiedServerAuth.isVerified, true);
  console.log('  ✔ Verified user properly identified as isVerified: true');

  // 4. Token verification - Google Sign-In Account
  console.log('Test 4: Google Sign-In Provider Identity');
  const googleToken = 'test_firebase_token_verified_usr03_google';
  const googleRes = await verifyFirebaseIdToken(googleToken);
  assert.equal(googleRes.success, true);
  assert.equal(googleRes.decoded?.email_verified, true);
  assert.equal(googleRes.decoded?.firebase.sign_in_provider, 'google.com');

  const googleServerAuth = await authenticateServerRequest(
    new Request('http://localhost:3000/api/rooms', {
      headers: { Authorization: `Bearer ${googleToken}` }
    })
  );
  assert.equal(googleServerAuth.authenticated, true);
  assert.equal(googleServerAuth.isVerified, true);
  assert.equal(googleServerAuth.provider, 'google.com');
  console.log('  ✔ Google Sign-In accounts authenticated and recognized as verified by default');

  // 5. Server API enforcement - authorizeRoomCreation blocks unverified user
  console.log('Test 5: Room Creation Enforcement for Unverified Account');
  const blockedReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${unverifiedToken}`
    }
  });

  const blockedResult = await authorizeRoomCreation(blockedReq, 'usr01');
  assert.equal(blockedResult.allowed, false);
  assert.equal(blockedResult.status, 403);
  assert.equal(blockedResult.code, 'EMAIL_NOT_VERIFIED');
  console.log('  ✔ Server authorization rejected unverified user with HTTP 403 EMAIL_NOT_VERIFIED');

  // 6. Server API enforcement - authorizeRoomCreation permits verified user
  console.log('Test 6: Room Creation Enforcement Permits Verified Account');
  const allowedReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verifiedToken}`
    }
  });

  const allowedResult = await authorizeRoomCreation(allowedReq, 'usr02');
  assert.equal(allowedResult.allowed, true);
  assert.equal(allowedResult.creatorId, 'usr02');
  console.log('  ✔ Server authorization permitted verified user with creatorId binding');

  // 7. Preservation of Guest Room Creation
  console.log('Test 7: Guest Room Creation Without Bearer Token');
  const guestReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const guestResult = await authorizeRoomCreation(guestReq, 'guest_random_abc');
  assert.equal(guestResult.allowed, true);
  console.log('  ✔ Anonymous guest room creation operates unhindered');

  // 8. Admin Control Center Isolation
  console.log('Test 8: Admin Control Center Isolation');
  // Confirm that a Firebase token (even verified) gives ZERO authorization to /api/admin/*
  const { authenticateAdminRequest } = await import('../src/lib/serverAdminStore.ts');
  const fakeAdminReq = new Request('http://localhost:3000/api/admin/metrics', {
    headers: {
      Authorization: `Bearer ${verifiedToken}`
    }
  });
  const adminAuth = authenticateAdminRequest(fakeAdminReq);
  assert.equal(adminAuth.authenticated, false);
  console.log('  ✔ Admin Control Center rejects Firebase tokens: strict isolation verified');

  // 9. Direct Handler Integration: POST /api/rooms rejects unverified bearer token
  console.log('Test 9: POST /api/rooms Direct Handler Rejects Unverified Account');
  const { POST: handleRoomPost } = await import('../src/app/api/rooms/route.ts');
  const directUnverifiedReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${unverifiedToken}`
    },
    body: JSON.stringify({
      roomId: 'test-room-unverified',
      salt: 'salt12345678',
      authCommitment: 'authcommit123',
      wrappedSecretBundle: { wrappedKey: 'wrappedKey', iv: 'iv123' },
      creatorId: 'usr01'
    })
  });
  const unverifiedRouteRes = await handleRoomPost(directUnverifiedReq);
  assert.equal(unverifiedRouteRes.status, 403);
  const unverifiedBody = await unverifiedRouteRes.json();
  assert.equal(unverifiedBody.code, 'EMAIL_NOT_VERIFIED');
  console.log('  ✔ POST /api/rooms directly returned HTTP 403 EMAIL_NOT_VERIFIED for unverified token');

  // 10. Direct Handler Integration: POST /api/rooms permits verified user and enforces server creatorId
  console.log('Test 10: POST /api/rooms Direct Handler Permits Verified Account');
  const directVerifiedReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verifiedToken}`
    },
    body: JSON.stringify({
      roomId: 'test-room-verified',
      salt: 'salt12345678',
      authCommitment: 'authcommit123',
      wrappedSecretBundle: { wrappedKey: 'wrappedKey', iv: 'iv123' },
      creatorId: 'impersonated_id_attacker' // Attacker attempts to forge creatorId
    })
  });
  const verifiedRouteRes = await handleRoomPost(directVerifiedReq);
  assert.equal(verifiedRouteRes.status, 200);
  const verifiedBody = await verifiedRouteRes.json();
  assert.equal(verifiedBody.success, true);
  // Verified that server overrode client-supplied creatorId with authenticated uid 'usr02'
  assert.equal(verifiedBody.room.creatorId, 'usr02');
  console.log('  ✔ POST /api/rooms succeeded and bound server-verified creatorId (ignoring client forgery)');

  // 11. Direct Handler Integration: POST /api/rooms permits guest creation
  console.log('Test 11: POST /api/rooms Direct Handler Permits Guest Creation');
  const directGuestReq = new Request('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      roomId: 'test-room-guest',
      salt: 'salt12345678',
      authCommitment: 'authcommit123',
      wrappedSecretBundle: { wrappedKey: 'wrappedKey', iv: 'iv123' }
    })
  });
  const guestRouteRes = await handleRoomPost(directGuestReq);
  assert.equal(guestRouteRes.status, 200);
  const guestBody = await guestRouteRes.json();
  assert.equal(guestBody.success, true);
  console.log('  ✔ POST /api/rooms permits legitimate guest room initialization');

  // 12. Storage Adapter Verification: InMemory and Distributed Adapter Contracts
  console.log('Test 12: Ephemeral Room Storage Adapter Architecture');
  const { InMemoryRoomStoreAdapter, DistributedRoomStoreAdapter } = await import('../src/lib/serverRoomAdapter.ts');
  const testMap = new Map();
  const inMemAdapter = new InMemoryRoomStoreAdapter(testMap);
  assert.equal(inMemAdapter.isDistributed, false);
  const sampleRecord: any = { meta: { id: 'test-adapter-room', state: 'CREATED' }, activeSockets: new Set(), recentPackets: [] };
  inMemAdapter.createRoom('test-adapter-room', sampleRecord);
  assert.equal(inMemAdapter.hasRoom('test-adapter-room'), true);
  assert.equal(inMemAdapter.getRoom('test-adapter-room')?.meta.id, 'test-adapter-room');
  inMemAdapter.deleteRoom('test-adapter-room');
  assert.equal(inMemAdapter.hasRoom('test-adapter-room'), false);

  const distributedAdapter = new DistributedRoomStoreAdapter('http://mock-redis', 'mock-token', testMap);
  assert.equal(distributedAdapter.isDistributed, true);
  assert.equal(distributedAdapter.isConfigured, true);
  console.log('  ✔ Storage adapter interface and InMemory / Distributed contracts verified');

  console.log('\n✔ All 12 Firebase Authentication, Authorization & Storage Adapter tests PASSED.');
}

if (process.argv[1]?.endsWith('firebaseAuth.test.ts')) {
  runFirebaseAuthTests().catch((err) => {
    console.error('Firebase Auth test error:', err);
    process.exit(1);
  });
}
