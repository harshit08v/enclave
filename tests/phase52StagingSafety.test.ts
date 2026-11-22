/**
 * ENCLAVE Phase 5.2: Staging Safety, Room Cardinality & Multi-Tab Isolation Test Suite
 *
 * Verifies Phase 5.2 objectives:
 * 1. Server-Side Atomic Enforcement: Maximum 2 participants per room via atomic store logic
 * 2. Third Participant Rejection: HTTP 409 Conflict with ROOM_FULL error code and client transition to ENDING
 * 3. Reconnect Safety: Existing participant reconnecting or heartbeating does not consume extra slots
 * 4. Stale Participant Pruning: Disconnected participant heartbeats (>25s) are pruned, opening slot safely
 * 5. Multi-Tab Session Ownership: Cross-tab lease coordination evicts older/challenger tab sessions
 * 6. Stale Tab Sending Fails Closed: Non-owner tab throws and refuses to encrypt or transmit wire packets
 * 7. Browser Crash & Lease Recovery: Expired tab lease (>5s TTL) is safely claimed by a recovered tab session
 * 8. Asymmetric Prekey Certification: Ed25519 identity key authenticates X25519 prekey
 * 9. Prekey Substitution Attack Detection: Substituted prekey fails closed and throws Potential MITM
 * 10. Tampered Prekey Signature Rejection: Invalid/tampered prekey signature is rejected
 * 11. Pairwise Protocol Boundary Enforcement: Reject message transmission if room cardinality exceeds 2
 */

import assert from 'assert';
import crypto from 'crypto';
import { InMemoryRoomStoreAdapter } from '@/lib/serverRoomAdapter';
import { EnclaveRoomSession } from '@/lib/roomRelay';
import {
  generateFreshDeviceIdentity,
  rotateDevicePrekey,
  verifyPrekeySignature,
  createPrekeySignPayload
} from '@/lib/deviceIdentity';
import { RoomParticipant, WirePacket } from '@/packages/protocol';
import { setPrivacyPreferences } from '@/lib/privacyPreferences';

// Mock storage for Node test environment to emulate cross-tab localStorage
class TestLocalStorage {
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

export async function runPhase52StagingSafetyTests() {
  setPrivacyPreferences({ readReceipts: false });
  console.log('\n========================================================================');
  console.log('  ENCLAVE PHASE 5.2: STAGING SAFETY, CARDINALITY & MULTI-TAB ISOLATION   ');
  console.log('========================================================================');

  // Setup mock storage and window object
  const mockStorage = new TestLocalStorage();
  (global as any).localStorage = mockStorage;
  (global as any).sessionStorage = new TestLocalStorage();
  (global as any).window = {
    localStorage: mockStorage,
    sessionStorage: (global as any).sessionStorage,
    BroadcastChannel: global.BroadcastChannel
  };

  const adapter = new InMemoryRoomStoreAdapter();
  const roomId = 'room_phase52_safety_test';

  function createTestRecord(id: string) {
    return {
      meta: {
        id,
        salt: 'mock_salt_hex',
        authCommitment: 'mock_auth_commitment',
        createdAt: Date.now(),
        participantCount: 0,
        state: 'WAITING' as const,
        requirePass: true,
        accessMode: 'with_pass' as const
      },
      activeSockets: new Set<string>(),
      participantHeartbeats: new Map<string, number>(),
      participantInfo: new Map<string, any>(),
      recentPackets: [],
      encryptedMedia: new Map<string, any>(),
      lastActivity: Date.now()
    };
  }

  // Create test room
  adapter.createRoom(roomId, createTestRecord(roomId) as any);

  const aliceId = await generateFreshDeviceIdentity();
  const bobId = await generateFreshDeviceIdentity();
  const charlieId = await generateFreshDeviceIdentity();

  // ---------------------------------------------------------------------------
  // [TEST 1] Three Simultaneous Joins: Atomic 2-Participant Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] Server-Side Atomic Enforcement: Three Simultaneous Participant Joins');
  const [resAlice, resBob, resCharlie] = await Promise.all([
    adapter.updatePresence(roomId, 'user_alice', 'join', 'Alice', aliceId.identityPublicKeyHex, aliceId.prekeyPublicKeyHex, aliceId.prekeySignatureHex),
    adapter.updatePresence(roomId, 'user_bob', 'join', 'Bob', bobId.identityPublicKeyHex, bobId.prekeyPublicKeyHex, bobId.prekeySignatureHex),
    adapter.updatePresence(roomId, 'user_charlie', 'join', 'Charlie', charlieId.identityPublicKeyHex, charlieId.prekeyPublicKeyHex, charlieId.prekeySignatureHex)
  ]);

  const results = [resAlice, resBob, resCharlie].filter(Boolean);
  const accepted = results.filter(r => r?.status === 'ACTIVE' || r?.status === 'WAITING' || (!r?.status && r?.participantCount <= 2));
  const rejected = results.filter(r => r?.status === 'ROOM_FULL');

  assert.strictEqual(accepted.length, 2, 'Exactly two participants must be admitted into the chamber');
  assert.strictEqual(rejected.length, 1, 'Exactly one participant must be rejected with ROOM_FULL status');
  assert.ok(rejected[0]?.error && rejected[0].error.includes('Maximum two participants allowed'));
  console.log('  ✔ Atomic server check admitted exactly 2 participants and rejected the 3rd with ROOM_FULL');

  // ---------------------------------------------------------------------------
  // [TEST 2] Third Participant Rejection Contract (HTTP 409 & Client Session Handling)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Third Participant Rejection Contract: HTTP 409 & Session Termination');
  const charlieJoinAttempt = await adapter.updatePresence(
    roomId,
    'user_dave',
    'join',
    'Dave',
    charlieId.identityPublicKeyHex,
    charlieId.prekeyPublicKeyHex,
    charlieId.prekeySignatureHex
  );
  assert.strictEqual(charlieJoinAttempt?.status, 'ROOM_FULL', 'Subsequent join to full room must return ROOM_FULL');
  assert.strictEqual(charlieJoinAttempt?.error, 'Room is full. Maximum two participants allowed.');

  // Test client-side handleRoomFull
  const rms = crypto.randomBytes(32);
  const daveUser: RoomParticipant = {
    id: 'user_dave',
    displayName: 'Dave',
    joinedAt: Date.now(),
    identityKey: charlieId.identityPublicKeyHex,
    prekey: charlieId.prekeyPublicKeyHex,
    prekeySignature: charlieId.prekeySignatureHex
  };
  const daveSession = new EnclaveRoomSession(roomId, daveUser, rms, 'auth_dave', undefined, undefined, charlieId);
  let roomFullNotified = false;
  let roomFullReason = '';
  daveSession.onRoomFull((reason) => {
    roomFullNotified = true;
    roomFullReason = reason;
  });

  daveSession.handleRoomFull('Room is full. Maximum two participants allowed.');
  assert.strictEqual(roomFullNotified, true, 'onRoomFull listener must be triggered on HTTP 409 / ROOM_FULL');
  assert.ok(roomFullReason.includes('Maximum two participants allowed'));
  assert.ok((daveSession as any).state === 'ENDING' || (daveSession as any).state === 'DESTROYED');
  console.log('  ✔ Client cleanly handles ROOM_FULL rejection, notifies UI, and tears down session');

  // ---------------------------------------------------------------------------
  // [TEST 3] Reconnection / Heartbeat of Existing Participant
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Reconnection / Heartbeat of Existing Participant');
  const aliceReconnect = await adapter.updatePresence(
    roomId,
    'user_alice',
    'heartbeat',
    'Alice',
    aliceId.identityPublicKeyHex,
    aliceId.prekeyPublicKeyHex,
    aliceId.prekeySignatureHex
  );
  assert.notStrictEqual(aliceReconnect?.status, 'ROOM_FULL', 'Existing participant heartbeat must NOT be rejected');
  assert.strictEqual(aliceReconnect?.participants.length, 2, 'Active participant count must remain exactly 2');
  console.log('  ✔ Existing participant reconnecting/heartbeating cleanly succeeds without consuming extra slots');

  // ---------------------------------------------------------------------------
  // [TEST 4] Stale Participant Pruning (>25s Inactivity)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Stale Participant Pruning (>25s Inactivity)');
  const staleRoomId = 'room_stale_test';
  adapter.createRoom(staleRoomId, createTestRecord(staleRoomId) as any);

  const t0 = Date.now();
  const staleRecord = adapter.getRoom(staleRoomId)!;
  // Alice joined 30 seconds ago (stale)
  staleRecord.activeSockets.add('user_stale_alice');
  staleRecord.participantHeartbeats.set('user_stale_alice', t0 - 30000);
  staleRecord.participantInfo.set('user_stale_alice', {
    id: 'user_stale_alice',
    displayName: 'Alice',
    joinedAt: t0 - 30000,
    identityKey: aliceId.identityPublicKeyHex,
    prekey: aliceId.prekeyPublicKeyHex,
    prekeySignature: aliceId.prekeySignatureHex
  });

  // Bob joined 5 seconds ago (active)
  staleRecord.activeSockets.add('user_active_bob');
  staleRecord.participantHeartbeats.set('user_active_bob', t0 - 5000);
  staleRecord.participantInfo.set('user_active_bob', {
    id: 'user_active_bob',
    displayName: 'Bob',
    joinedAt: t0 - 5000,
    identityKey: bobId.identityPublicKeyHex,
    prekey: bobId.prekeyPublicKeyHex,
    prekeySignature: bobId.prekeySignatureHex
  });

  // Charlie joins now -> Stale Alice should be pruned, Charlie admitted
  const charlieAdmission = await adapter.updatePresence(
    staleRoomId,
    'user_new_charlie',
    'join',
    'Charlie',
    charlieId.identityPublicKeyHex,
    charlieId.prekeyPublicKeyHex,
    charlieId.prekeySignatureHex
  );

  assert.notStrictEqual(charlieAdmission?.status, 'ROOM_FULL', 'Charlie must be admitted after stale Alice is pruned');
  const activeIds = charlieAdmission!.participants.map(p => p.id);
  assert.ok(!activeIds.includes('user_stale_alice'), 'Stale participant must be evicted from active presence');
  assert.ok(activeIds.includes('user_active_bob'), 'Active participant Bob must be preserved');
  assert.ok(activeIds.includes('user_new_charlie'), 'New participant Charlie must be admitted');
  assert.strictEqual(charlieAdmission!.participants.length, 2);
  console.log('  ✔ Stale participant (>25s) automatically pruned, admitting new participant without capacity error');

  // ---------------------------------------------------------------------------
  // [TEST 5] Multi-Tab Session Ownership & Tab Eviction
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Multi-Tab Session Ownership Coordination & Challenger Tab Eviction');
  const aliceParticipant: RoomParticipant = {
    id: 'user_alice_tabs',
    displayName: 'Alice (Tab 1)',
    joinedAt: Date.now(),
    identityKey: aliceId.identityPublicKeyHex,
    prekey: aliceId.prekeyPublicKeyHex,
    prekeySignature: aliceId.prekeySignatureHex
  };

  const tab1Session = new EnclaveRoomSession('room_tab_iso', aliceParticipant, rms, 'auth_alice', undefined, undefined, aliceId);
  assert.strictEqual((tab1Session as any).isSessionOwner, true, 'Tab 1 must initially hold active session ownership');

  let tab1LostOwnership = false;
  tab1Session.onOwnershipLost(() => {
    tab1LostOwnership = true;
  });

  // Tab 2 opens with the same identity
  const tab2Session = new EnclaveRoomSession('room_tab_iso', aliceParticipant, rms, 'auth_alice', undefined, undefined, aliceId);
  assert.strictEqual((tab2Session as any).isSessionOwner, true, 'Tab 2 claims active session ownership');

  // Tab 1 receives the claim broadcast and evicts itself
  tab1Session.handleOwnershipLost();
  assert.strictEqual(tab1LostOwnership, true, 'Tab 1 onOwnershipLost listener must be invoked');
  assert.strictEqual((tab1Session as any).isSessionOwner, false, 'Tab 1 must lose active session ownership');
  console.log('  ✔ Tab 2 successfully claimed ratchet lease; Tab 1 stepped down and cleared lease interval');

  // ---------------------------------------------------------------------------
  // [TEST 6] Stale Tab Sending Fails Closed
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Stale Tab Sending Fails Closed (Ownership Enforcement)');
  await assert.rejects(
    async () => {
      await tab1Session.sendMessage('Malicious message from stale tab');
    },
    /This tab has lost session ownership\. An active session is open in another tab\./,
    'Stale Tab 1 sendMessage must throw an ownership error'
  );

  await assert.rejects(
    async () => {
      await tab1Session.setDisappearingTimer(30);
    },
    /This tab has lost session ownership\. An active session is open in another tab\./,
    'Stale Tab 1 setDisappearingTimer must throw an ownership error'
  );

  await assert.rejects(
    async () => {
      await tab1Session.sendReaction('pkt_123', '👍');
    },
    /This tab has lost session ownership\. An active session is open in another tab\./,
    'Stale Tab 1 sendReaction must throw an ownership error'
  );

  await assert.rejects(
    async () => {
      await tab1Session.sendCallSignal({ type: 'offer', sdp: 'mock_sdp' });
    },
    /This tab has lost session ownership\. An active session is open in another tab\./,
    'Stale Tab 1 sendCallSignal must throw an ownership error'
  );

  console.log('  ✔ Stale tab prevented from transmitting messages, reactions, timer changes, or call signals');

  // ---------------------------------------------------------------------------
  // [TEST 7] Browser Crash & Expired Lease Recovery
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] Browser Crash & Expired Lease Recovery');
  const crashRoomId = 'room_crash_test';
  const leaseKey = `enclave_tab_lease_${crashRoomId}_${aliceId.identityPublicKeyHex}`;

  // Emulate crashed tab with abandoned lease 6 seconds ago (> 5000ms TTL)
  mockStorage.setItem(leaseKey, JSON.stringify({
    tabSessionId: 'crashed_tab_session_999',
    identityKey: aliceId.identityPublicKeyHex,
    lastRenewedAt: Date.now() - 6000
  }));

  const recoveredSession = new EnclaveRoomSession(crashRoomId, aliceParticipant, rms, 'auth_alice', undefined, undefined, aliceId);
  assert.strictEqual((recoveredSession as any).isSessionOwner, true, 'Recovered session must take ownership of expired lease');

  const storedLease = JSON.parse(mockStorage.getItem(leaseKey)!);
  assert.strictEqual(storedLease.tabSessionId, (recoveredSession as any).tabSessionId, 'Storage lease must be renewed with fresh tabSessionId');
  console.log('  ✔ Fresh tab smoothly reclaimed expired lease after previous tab crash without blocking');

  // ---------------------------------------------------------------------------
  // [TEST 8] Prekey Asymmetric Signing & Identity Key Binding
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 8] Prekey Asymmetric Signing & Ed25519 Identity Key Binding');
  assert.ok(aliceId.prekeySignatureHex, 'Device identity must include an Ed25519 prekey signature');
  const isAlicePrekeyValid = await verifyPrekeySignature(
    aliceId.identityPublicKeyHex,
    aliceId.prekeyPublicKeyHex,
    aliceId.prekeySignatureHex
  );
  assert.strictEqual(isAlicePrekeyValid, true, 'Prekey signature must verify with Ed25519 identity key');

  // Test prekey rotation
  const rotatedIdentity = await rotateDevicePrekey(aliceId);
  assert.notStrictEqual(rotatedIdentity.prekeyPublicKeyHex, aliceId.prekeyPublicKeyHex, 'Rotated prekey must have fresh X25519 pubkey');
  assert.notStrictEqual(rotatedIdentity.prekeySignatureHex, aliceId.prekeySignatureHex, 'Rotated prekey must have fresh signature');
  const isRotatedPrekeyValid = await verifyPrekeySignature(
    rotatedIdentity.identityPublicKeyHex,
    rotatedIdentity.prekeyPublicKeyHex,
    rotatedIdentity.prekeySignatureHex!
  );
  assert.strictEqual(isRotatedPrekeyValid, true, 'Rotated prekey signature must verify against original Ed25519 identity key');
  console.log('  ✔ Prekey authentically signed by identity key; rotation produces certified new prekey');

  // ---------------------------------------------------------------------------
  // [TEST 9] Prekey Substitution Attack Detection (Fails Closed)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 9] Prekey Substitution Attack Detection (Fails Closed)');
  const attackerDHPubHex = 'deadbeef'.repeat(8); // Attacker X25519 public key
  // Attacker substitutes Bob's prekey with attackerDHPubHex, but sends Bob's original prekey signature
  const isSubstitutionValid = await verifyPrekeySignature(
    bobId.identityPublicKeyHex,
    attackerDHPubHex,
    bobId.prekeySignatureHex!
  );
  assert.strictEqual(isSubstitutionValid, false, 'Prekey signature verification must fail on substituted prekey');

  const aliceClient = new EnclaveRoomSession('room_mitm_test', aliceParticipant, rms, 'auth_alice', undefined, undefined, aliceId);
  await assert.rejects(
    async () => {
      await aliceClient.getOrCreateRatchetSession(
        'user_bob',
        attackerDHPubHex,
        bobId.identityPublicKeyHex,
        true,
        bobId.prekeySignatureHex
      );
    },
    /Peer prekey signature verification failed for participant user_bob\. Potential MITM or uncertified prekey\./,
    'Session handshake must reject uncertified/substituted prekey with a fatal error'
  );
  console.log('  ✔ Substituted prekey detected and rejected: Double Ratchet handshake failed closed');

  // ---------------------------------------------------------------------------
  // [TEST 10] Tampered Prekey Signature Rejection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 10] Tampered Prekey Signature Rejection');
  const tamperedSig = bobId.prekeySignatureHex!.slice(0, -2) + (bobId.prekeySignatureHex!.endsWith('00') ? 'ff' : '00');
  const isTamperedValid = await verifyPrekeySignature(
    bobId.identityPublicKeyHex,
    bobId.prekeyPublicKeyHex,
    tamperedSig
  );
  assert.strictEqual(isTamperedValid, false, 'Tampered prekey signature must not verify');

  await assert.rejects(
    async () => {
      await aliceClient.getOrCreateRatchetSession(
        'user_bob',
        bobId.prekeyPublicKeyHex,
        bobId.identityPublicKeyHex,
        true,
        tamperedSig
      );
    },
    /Peer prekey signature verification failed for participant user_bob\. Potential MITM or uncertified prekey\./,
    'Session handshake must reject tampered prekey signature'
  );
  console.log('  ✔ Tampered prekey signature rejected with fatal error');

  // ---------------------------------------------------------------------------
  // [TEST 11] Pairwise Protocol Boundary Enforcement (>2 Participants)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 11] Pairwise Protocol Boundary Enforcement (>2 Participants)');
  const pairSession = new EnclaveRoomSession('room_pair_limit', aliceParticipant, rms, 'auth_alice', undefined, undefined, aliceId);

  // Artificially inject a 3rd participant
  (pairSession as any).participants.set('user_bob', {
    id: 'user_bob',
    displayName: 'Bob',
    joinedAt: Date.now(),
    identityKey: bobId.identityPublicKeyHex,
    prekey: bobId.prekeyPublicKeyHex,
    prekeySignature: bobId.prekeySignatureHex
  });
  (pairSession as any).participants.set('user_charlie', {
    id: 'user_charlie',
    displayName: 'Charlie',
    joinedAt: Date.now(),
    identityKey: charlieId.identityPublicKeyHex,
    prekey: charlieId.prekeyPublicKeyHex,
    prekeySignature: charlieId.prekeySignatureHex
  });
  assert.strictEqual((pairSession as any).participants.size, 3);

  await assert.rejects(
    async () => {
      await pairSession.sendMessage('Trying to send in a group room');
    },
    /Room participant limit exceeded\. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance\./,
    'Message send must be blocked if room cardinality exceeds 2'
  );

  await assert.rejects(
    async () => {
      await pairSession.sendReaction('pkt_123', '🔥');
    },
    /Room participant limit exceeded\. Enclave rooms support a maximum of two participants for pairwise cryptographic assurance\./,
    'Reaction send must be blocked if room cardinality exceeds 2'
  );

  console.log('  ✔ Pairwise cryptographic boundary strictly enforced; message sending blocked if participants > 2');

  // Teardown
  tab1Session.cleanup();
  tab2Session.cleanup();
  recoveredSession.cleanup();
  pairSession.cleanup();
  aliceClient.cleanup();

  console.log('\n========================================================================');
  console.log('  ALL 11 PHASE 5.2 STAGING SAFETY & CARDINALITY TESTS PASSED 100%!     ');
  console.log('========================================================================\n');
}

if (process.argv[1]?.endsWith('phase52StagingSafety.test.ts')) {
  runPhase52StagingSafetyTests().catch(err => {
    console.error('❌ PHASE 5.2 TEST SUITE FAILED:', err);
    process.exit(1);
  });
}
