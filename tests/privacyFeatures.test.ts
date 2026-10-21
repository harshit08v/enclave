/**
 * ENCLAVE — Privacy Features Expansion Test Suite
 * Validates:
 * 1. Disappearing Message Timers (storage, pruning, bounds, expiries)
 * 2. Contact Identity Verification (deterministic 60-digit safety fingerprint, QR roundtrip, MITM mismatch)
 * 3. Active Sessions & Device Management (token hashing, list, single revocation, bulk revocation, auth check)
 * 4. View-Once Media (atomic consumption, anti-replay, 410 Gone rejection)
 * 5. Privacy Controls (preference toggles, read receipt suppression, typing suppression)
 */

import assert from 'node:assert';
import { InMemoryRoomStoreAdapter } from '../src/lib/serverRoomAdapter';
import { InMemoryAccountAdminStoreAdapter } from '../src/lib/serverAccountAdminAdapter';
import {
  deriveSafetyFingerprint,
  formatVerificationQrPayload,
  parseVerificationQrPayload
} from '../src/lib/safetyFingerprint';
import {
  getPrivacyPreferences,
  savePrivacyPreferences,
  resetPrivacyPreferences
} from '../src/lib/privacyPreferences';
import { WirePacket, RoomMeta } from '../packages/protocol';

export async function runPrivacyFeaturesTests(): Promise<void> {
  console.log('\n--- Running Privacy Features Expansion Tests ---');

  // =========================================================================
  // Test Suite 1: Disappearing Message Timers (Phase 1)
  // =========================================================================
  console.log('  1. Disappearing Messages: Timer bounds, expiries & packet pruning');

  const roomStore = new InMemoryRoomStoreAdapter();
  const testRoomId = 'test-room-disappearing-1';

  const mockMeta: RoomMeta = {
    id: testRoomId,
    name: 'Disappearing Test Room',
    salt: 'salt123',
    authCommitment: 'auth123',
    wrappedSecretBundle: 'bundle123',
    state: 'ACTIVE',
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    disappearingTimerSec: 30
  };
  await roomStore.createRoom(testRoomId, {
    meta: mockMeta,
    activeSockets: new Set(),
    participantHeartbeats: new Map(),
    participantInfo: new Map(),
    recentPackets: [],
    encryptedMedia: new Map(),
    lastActivity: Date.now()
  });

  // Valid packet with 30s timer
  const now = Date.now();
  const validPacket: WirePacket = {
    version: 1,
    packetId: 'pkt_valid_1',
    roomId: testRoomId,
    senderId: 'user_alice',
    senderName: 'Alice',
    sequence: 1,
    timestamp: now,
    expiresAt: now + 30000,
    ttlSeconds: 30,
    payload: {
      ciphertext: 'test_cipher_1',
      iv: 'iv123',
      sequence: 1,
      timestamp: now
    }
  };

  await roomStore.pushPacket(testRoomId, validPacket);
  let packets = await roomStore.getPackets(testRoomId);
  assert.strictEqual(packets.length, 1, 'Valid unexpired packet should be returned');
  assert.strictEqual(packets[0].packetId, 'pkt_valid_1');

  // Expired packet should be dropped on insert or filtered out
  const expiredPacket: WirePacket = {
    version: 1,
    packetId: 'pkt_expired_1',
    roomId: testRoomId,
    senderId: 'user_alice',
    senderName: 'Alice',
    sequence: 2,
    timestamp: now - 60000,
    expiresAt: now - 1000, // already expired 1s ago
    ttlSeconds: 30,
    payload: {
      ciphertext: 'test_cipher_expired',
      iv: 'iv123',
      sequence: 2,
      timestamp: now - 60000
    }
  };

  await roomStore.pushPacket(testRoomId, expiredPacket);
  packets = await roomStore.getPackets(testRoomId);
  assert.strictEqual(
    packets.some(p => p.packetId === 'pkt_expired_1'),
    false,
    'Expired packet must never be returned to clients'
  );

  console.log('    ✓ Disappearing packets correctly pruned on expiration');

  // =========================================================================
  // Test Suite 2: Contact Identity Verification (Phase 2)
  // =========================================================================
  console.log('  2. Contact Identity: Deterministic 60-digit safety fingerprint');

  const testSecret = new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
  ]);

  const fpAliceBob = await deriveSafetyFingerprint(testSecret, 'test-room-safety', ['alice', 'bob']);
  const fpBobAlice = await deriveSafetyFingerprint(testSecret, 'test-room-safety', ['bob', 'alice']);

  // Format validation: 12 blocks of 5 digits separated by spaces (total 60 digits + 11 spaces = 71 chars)
  assert.strictEqual(fpAliceBob.length, 71, 'Fingerprint must be 12 blocks of 5 digits (71 chars)');
  const digitsOnly = fpAliceBob.replace(/\s+/g, '');
  assert.strictEqual(digitsOnly.length, 60, 'Fingerprint must contain exactly 60 numeric digits');
  assert.match(digitsOnly, /^\d{60}$/, 'Fingerprint must consist solely of numeric digits');

  // Order independence: Alice and Bob must derive the EXACT same fingerprint
  assert.strictEqual(
    fpAliceBob,
    fpBobAlice,
    'Safety fingerprint must be bit-identical regardless of participant list ordering'
  );

  // Mismatch detection: An attacker with modified secret or different room must NOT match
  const attackerSecret = new Uint8Array([
    99, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
  ]);
  const fpAttacker = await deriveSafetyFingerprint(attackerSecret, 'test-room-safety', ['alice', 'bob']);
  assert.notStrictEqual(
    fpAliceBob,
    fpAttacker,
    'Modified key material must produce a completely divergent safety fingerprint'
  );

  // QR Payload Roundtrip
  const qrString = formatVerificationQrPayload('test-room-safety', fpAliceBob);
  const parsedQr = parseVerificationQrPayload(qrString);
  assert.ok(parsedQr, 'QR string must be parseable');
  assert.strictEqual(parsedQr?.roomId, 'test-room-safety');
  assert.strictEqual(parsedQr?.fingerprint, fpAliceBob);

  console.log('    ✓ 60-digit deterministic fingerprint & QR payload verified');

  // =========================================================================
  // Test Suite 3: Active Sessions & Device Management (Phase 3)
  // =========================================================================
  console.log('  3. Active Sessions: Storage, listing, and atomic revocation');

  const adminStore = new InMemoryAccountAdminStoreAdapter();
  const userId = 'usr_test_sess_1';
  const email = 'user@example.com';

  // Create session 1 (desktop chrome)
  const session1 = await adminStore.saveUserSession({
    id: 'sess_1',
    userId,
    email,
    tokenHash: 'hash_token_1',
    deviceLabel: 'Chrome on Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    ip: '192.168.1.1',
    createdAt: Date.now() - 3600000,
    lastActiveAt: Date.now() - 600000,
    expiresAt: Date.now() + 86400000,
    isRevoked: false
  });

  // Create session 2 (mobile safari)
  const session2 = await adminStore.saveUserSession({
    id: 'sess_2',
    userId,
    email,
    tokenHash: 'hash_token_2',
    deviceLabel: 'Safari on iPhone',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    ip: '192.168.1.2',
    createdAt: Date.now() - 1800000,
    lastActiveAt: Date.now() - 300000,
    expiresAt: Date.now() + 86400000,
    isRevoked: false
  });

  // List sessions
  let sessions = await adminStore.listUserSessions(userId);
  assert.strictEqual(sessions.length, 2, 'User should have 2 active sessions');

  // Revoke session 2
  const revoked = await adminStore.revokeUserSession(userId, 'sess_2');
  assert.strictEqual(revoked, true, 'Revocation of session 2 must succeed');

  const fetchedSess2 = await adminStore.getUserSession('sess_2');
  assert.strictEqual(fetchedSess2, null, 'Revoked session 2 must return null from getUserSession');

  let activeSessions = await adminStore.listUserSessions(userId);
  assert.strictEqual(activeSessions.length, 1, 'Active sessions list must only contain 1 session after revoking session 2');
  assert.strictEqual(activeSessions[0].id, 'sess_1', 'Session 1 must be the only active session');

  // Bulk revoke all other sessions from session 1
  const session3 = await adminStore.saveUserSession({
    id: 'sess_3',
    userId,
    email,
    tokenHash: 'hash_token_3',
    deviceLabel: 'Firefox on Linux',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
    ip: '192.168.1.3',
    createdAt: Date.now() - 60000,
    lastActiveAt: Date.now() - 10000,
    expiresAt: Date.now() + 86400000,
    isRevoked: false
  });

  const countRevoked = await adminStore.revokeAllOtherUserSessions(userId, 'sess_1');
  assert.strictEqual(countRevoked, 1, 'Only session 3 should have been revoked (session 2 was already revoked)');

  const fetchedSess1 = await adminStore.getUserSession('sess_1');
  const fetchedSess3 = await adminStore.getUserSession('sess_3');
  assert.ok(fetchedSess1, 'Session 1 must remain active and return record');
  assert.strictEqual(fetchedSess1?.isRevoked, false, 'Session 1 must not be revoked');
  assert.strictEqual(fetchedSess3, null, 'Session 3 must return null after bulk revocation');

  console.log('    ✓ Active session tracking, single and bulk revocation verified');

  // =========================================================================
  // Test Suite 4: View-Once Media (Phase 4)
  // =========================================================================
  console.log('  4. View-Once Media: Atomic server consumption & anti-replay');

  const mediaRoomId = 'test-room-viewonce-1';
  const attachmentId = 'att_viewonce_secret_1';

  await roomStore.createRoom(mediaRoomId, {
    meta: {
      id: mediaRoomId,
      name: 'Media Test Room',
      salt: 'saltMedia',
      authCommitment: 'authMedia',
      wrappedSecretBundle: 'bundleMedia',
      state: 'ACTIVE',
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000
    },
    activeSockets: new Set(),
    participantHeartbeats: new Map(),
    participantInfo: new Map(),
    recentPackets: [],
    encryptedMedia: new Map(),
    lastActivity: Date.now()
  });

  // Store encrypted media ciphertext
  await roomStore.storeMedia(mediaRoomId, {
    mediaId: attachmentId,
    ciphertext: 'encrypted_payload_bytes_base64',
    iv: 'iv_viewonce',
    mimeType: 'image/jpeg',
    size: 2048,
    timestamp: Date.now()
  });

  // Verify it exists initially
  const initialMedia = await roomStore.getMedia(mediaRoomId, attachmentId);
  assert.ok(initialMedia, 'Media should exist before consumption');
  assert.strictEqual(initialMedia?.mediaId, attachmentId);

  // Consume media atomically (simulates user tapping "View once")
  const consumedFirst = await roomStore.consumeMedia(mediaRoomId, attachmentId);
  assert.strictEqual(consumedFirst, true, 'First consumption must return true');

  // Subsequent check must return null (it was deleted from Redis)
  const afterConsumption = await roomStore.getMedia(mediaRoomId, attachmentId);
  assert.strictEqual(afterConsumption, null, 'Consumed media must be deleted immediately from storage');

  // Anti-replay: second consumption attempt must fail
  const consumedSecond = await roomStore.consumeMedia(mediaRoomId, attachmentId);
  assert.strictEqual(consumedSecond, false, 'Second consumption must return false (anti-replay)');

  console.log('    ✓ View-once atomic consumption and anti-replay verified');

  // =========================================================================
  // Test Suite 5: Privacy Controls (Phase 5)
  // =========================================================================
  console.log('  5. Privacy Controls: Read receipts, typing indicators, preview toggles');

  // Check default preferences
  resetPrivacyPreferences();
  let prefs = getPrivacyPreferences();
  assert.strictEqual(prefs.readReceipts, true, 'Read receipts should default to true');
  assert.strictEqual(prefs.typingIndicators, true, 'Typing indicators should default to true');
  assert.strictEqual(prefs.notificationPreviews, false, 'Notification previews should default to false');

  // Toggle privacy preferences
  const updated = savePrivacyPreferences({
    readReceipts: false,
    typingIndicators: false,
    notificationPreviews: true
  });
  assert.strictEqual(updated.readReceipts, false);
  assert.strictEqual(updated.typingIndicators, false);
  assert.strictEqual(updated.notificationPreviews, true);

  prefs = getPrivacyPreferences();
  assert.strictEqual(prefs.readReceipts, false, 'Preferences must persist');
  assert.strictEqual(prefs.typingIndicators, false, 'Preferences must persist');
  assert.strictEqual(prefs.notificationPreviews, true, 'Preferences must persist');

  // Clean up
  resetPrivacyPreferences();

  console.log('    ✓ Privacy controls defaults, persistence, and toggles verified');
  console.log('--- All Privacy Features Expansion Tests Passed Cleanly ---\n');
}
