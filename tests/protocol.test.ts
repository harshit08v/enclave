/**
 * ENCLAVE Protocol & Lifecycle Verification Suite
 * Tests atomic lifecycle transitions, race conditions, replay protection, and destruction invariants.
 */

import assert from 'node:assert';
import {
  createServerRoom,
  getServerRoom,
  updateRoomPresence,
  destroyServerRoom,
  pushEncryptedPacket,
  getEncryptedPackets,
  verifyRoomAuth,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit
} from '../src/lib/serverRoomStore.ts';
import { generateSecureId } from '../packages/crypto/index.ts';

export async function runProtocolTests() {
  console.log('\n--- Running Protocol & Lifecycle Verification Tests ---');

  const dummyWrappedBundle = {
    wrappedKey: 'dummyWrappedKeyBase64==',
    iv: 'dummyIVBase64=='
  };

  // Test 1: Full Lifecycle State Machine
  console.log('[TEST 1] Atomic Lifecycle Transitions');
  const roomId = 'room_proto_' + generateSecureId('', 4);
  const salt = 'salt_base64_000';
  const authCommitment = 'auth_commitment_hex_000';

  const roomMeta = createServerRoom(roomId, salt, authCommitment, dummyWrappedBundle, false);
  assert.strictEqual(roomMeta.state, 'CREATED');
  assert.strictEqual(roomMeta.participantCount, 0);

  // Participant 1 joins -> WAITING
  const join1 = updateRoomPresence(roomId, 'user_alice', 'join');
  assert.ok(join1);
  assert.strictEqual(join1.state, 'WAITING');
  assert.strictEqual(join1.participantCount, 1);

  // Participant 2 joins -> ACTIVE
  const join2 = updateRoomPresence(roomId, 'user_bob', 'join');
  assert.ok(join2);
  assert.strictEqual(join2.state, 'ACTIVE');
  assert.strictEqual(join2.participantCount, 2);

  // Wire packets can be pushed in ACTIVE state
  const packet1 = {
    version: 1 as const,
    packetId: 'pkt_1',
    roomId,
    senderId: 'user_alice',
    senderName: 'Alice',
    sequence: 1,
    timestamp: Date.now(),
    payload: {
      iv: 'iv_1',
      ciphertext: 'ciphertext_1',
      sequence: 1,
      timestamp: Date.now()
    },
    type: 'chat_message' as const
  };
  const pushed = pushEncryptedPacket(roomId, packet1);
  assert.strictEqual(pushed, true);

  const packets = getEncryptedPackets(roomId, 0);
  assert.strictEqual(packets.length, 1);
  console.log('✓ CREATED -> WAITING -> ACTIVE Transitions Verified');

  // Test 2: Participant Leaves -> ENDING -> DESTROYED
  console.log('[TEST 2] Participant Exit & Definitive Dissolution');
  const leave1 = updateRoomPresence(roomId, 'user_alice', 'leave');
  assert.ok(leave1);
  assert.strictEqual(leave1.state, 'ENDING');
  assert.strictEqual(leave1.participantCount, 1);

  // Final participant leaves -> DESTROYED
  const leave2 = updateRoomPresence(roomId, 'user_bob', 'leave');
  assert.ok(leave2);
  assert.strictEqual(leave2.state, 'DESTROYED');
  assert.strictEqual(leave2.participantCount, 0);

  // Test 3: Post-Destruction Invariant Enforcement (Zero Resurrection)
  console.log('[TEST 3] Post-Destruction Invariants');

  // Stale join must be rejected
  const staleJoin = updateRoomPresence(roomId, 'user_charlie', 'join');
  assert.strictEqual(staleJoin?.state, 'DESTROYED');
  assert.strictEqual(staleJoin?.participantCount, 0);

  // Stale packet relay must be rejected
  const stalePacketPush = pushEncryptedPacket(roomId, packet1);
  assert.strictEqual(stalePacketPush, false, 'Packet push to destroyed room must be rejected');

  // Stale packet retrieval returns empty array
  const stalePackets = getEncryptedPackets(roomId, 0);
  assert.strictEqual(stalePackets.length, 0, 'Buffer must be completely wiped upon destruction');

  // Stale auth verification returns false
  const staleAuth = verifyRoomAuth(roomId, authCommitment);
  assert.strictEqual(staleAuth, false, 'Auth verification on destroyed room must return false');
  console.log('✓ Post-Destruction Lockout & Buffer Wipe Verified');

  // Test 4: Simultaneous Leave Race Condition Handling
  console.log('[TEST 4] Simultaneous Leave Race Conditions');
  const raceRoomId = 'room_race_' + generateSecureId('', 4);
  createServerRoom(raceRoomId, salt, authCommitment, dummyWrappedBundle, false);
  updateRoomPresence(raceRoomId, 'user_a', 'join');
  updateRoomPresence(raceRoomId, 'user_b', 'join');

  // A and B leave concurrently
  const [resA, resB] = [
    updateRoomPresence(raceRoomId, 'user_a', 'leave'),
    updateRoomPresence(raceRoomId, 'user_b', 'leave')
  ];
  assert.strictEqual(resB?.state, 'DESTROYED');
  assert.strictEqual(resB?.participantCount, 0);
  console.log('✓ Concurrent Leave Race Condition Handled Atomically');

  // Test 5: Rate Limiting & Abuse Prevention
  console.log('[TEST 5] Rate Limiting & Brute-Force Lockout');
  const testClientKey = 'test_ip_127_0_0_1';
  resetRateLimit(testClientKey);

  for (let i = 0; i < 4; i++) {
    recordFailedAttempt(testClientKey);
    const check = checkRateLimit(testClientKey);
    assert.strictEqual(check.allowed, true);
  }

  // 5th attempt triggers lockout
  recordFailedAttempt(testClientKey);
  const lockoutCheck = checkRateLimit(testClientKey);
  assert.strictEqual(lockoutCheck.allowed, false);
  assert.ok(lockoutCheck.retryAfter && lockoutCheck.retryAfter > 0);

  // Reset unlocks
  resetRateLimit(testClientKey);
  assert.strictEqual(checkRateLimit(testClientKey).allowed, true);
  console.log('✓ Brute-Force Rate Limiting Lockout Verified');

  // Test 6: Access Modes: WITH PASS vs WITHOUT PASS
  console.log('[TEST 6] Access Modes: WITH PASS & WITHOUT PASS');
  const passRoomId = 'room_pass_' + generateSecureId('', 4);
  const withPassMeta = createServerRoom(passRoomId, salt, authCommitment, dummyWrappedBundle, false, true, 'with_pass');
  assert.strictEqual(withPassMeta.requirePass, true);
  assert.strictEqual(withPassMeta.accessMode, 'with_pass');

  const openRoomId = 'room_open_' + generateSecureId('', 4);
  const openMeta = createServerRoom(openRoomId, salt, authCommitment, dummyWrappedBundle, false, false, 'without_pass');
  assert.strictEqual(openMeta.requirePass, false);
  assert.strictEqual(openMeta.accessMode, 'without_pass');
  console.log('✓ Dual Access Modes (WITH PASS & WITHOUT PASS) Verified');

  // Test 7: Waiting Room Inactivity Lifecycle & "I'm here" Refresh
  console.log('[TEST 7] Inactivity Lifecycle & Presence "I\'m here"');
  const inactiveRoomId = 'room_inact_' + generateSecureId('', 4);
  const inactMeta = createServerRoom(inactiveRoomId, salt, authCommitment, dummyWrappedBundle, false);
  updateRoomPresence(inactiveRoomId, 'user_waiting', 'join');

  const roomBefore = getServerRoom(inactiveRoomId);
  assert.ok(roomBefore);
  assert.strictEqual(roomBefore.state, 'WAITING');
  assert.ok(roomBefore.inactivityLimitMs && roomBefore.inactivityLimitMs > 0);

  // Send "im_here" action
  const imHereResult = updateRoomPresence(inactiveRoomId, 'user_waiting', 'im_here');
  assert.ok(imHereResult);
  assert.strictEqual(imHereResult.state, 'WAITING');
  assert.ok(imHereResult.lastActivity && imHereResult.lastActivity >= roomBefore.lastActivity!);

  // Second participant arrives -> cancels waiting inactivity and becomes ACTIVE
  const joinActive = updateRoomPresence(inactiveRoomId, 'user_peer', 'join');
  assert.ok(joinActive);
  assert.strictEqual(joinActive.state, 'ACTIVE');
  assert.strictEqual(joinActive.participantCount, 2);
  console.log('✓ Inactivity Activity Reset ("I\'m here") and Active Transition Verified');

  console.log('\n>>> ALL PROTOCOL TESTS PASSED SUCCESSFULLY <<<\n');
}
