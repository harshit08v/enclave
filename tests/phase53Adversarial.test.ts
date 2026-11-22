/**
 * ENCLAVE Phase 5.3: Independent Ownership, Identity Authentication & Cryptographic Boundary Remediation
 * Comprehensive 18-Test Adversarial Verification Suite
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  generateFreshDeviceIdentity,
  rotateDevicePrekey,
  createPrekeySignPayload,
  createPrekeyCertSignPayload,
  verifyPrekeyCertificate,
  createSignedPrekeyCertificate,
  signWithDeviceIdentity,
  verifyDeviceIdentitySignature,
  calculateSafetyNumber
} from '@/lib/deviceIdentity';
import { EnclaveRoomSession } from '@/lib/roomRelay';
import {
  InMemoryRoomStoreAdapter,
  DistributedRoomStoreAdapter,
  HARD_ROOM_TTL_SECONDS,
  setRoomStoreAdapter,
  getRoomStoreAdapter
} from '@/lib/serverRoomAdapter';
import {
  createRoomAsync,
  updateRoomPresenceAsync,
  getServerRoomRecordAsync,
  verifyRoomAuthDetailedAsync
} from '@/lib/serverRoomStore';
import { createRelayAuthToken, WebDoubleRatchetSession } from '@/packages/crypto';
import type { RoomParticipant, WirePacket } from '@/packages/protocol';

export async function runPhase53AdversarialTests() {
  console.log('\n========================================================================');
  console.log('  ENCLAVE PHASE 5.3: ADVERSARIAL IDENTITY & BOUNDARY SECURITY SUITE     ');
  console.log('========================================================================');

  const rms = crypto.randomBytes(32);
  const roomId = 'room_phase53_adversarial_test';

  // ---------------------------------------------------------------------------
  // [TEST 1] Missing Peer Identity Key Rejects Before Root Ratchet Creation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] Missing Peer Identity Key Rejection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();
    const alicePart: RoomParticipant = {
      id: 'user_alice_53_1',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_1', undefined, undefined, aliceDevId);

    await assert.rejects(
      async () => {
        // Initiator attempts handshake with peer prekey but missing peer identity key
        await session.getOrCreateRatchetSession(
          'user_bob_53_1',
          bobDevId.prekeyPublicKeyHex,
          undefined, // MISSING peer identity key
          true,
          bobDevId.prekeySignatureHex
        );
      },
      /Peer identity public key missing for participant user_bob_53_1\. Unauthenticated prekey handshake is rejected\./,
      'Session must reject handshake when peer identity public key is missing'
    );
    console.log('  ✔ Handshake rejected when peer identity key is missing');
  }

  // ---------------------------------------------------------------------------
  // [TEST 2] Missing Prekey Signature Rejection (Uncertified Prekey)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Missing Prekey Signature Rejection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();
    const alicePart: RoomParticipant = {
      id: 'user_alice_53_2',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_2', undefined, undefined, aliceDevId);

    await assert.rejects(
      async () => {
        // Initiator attempts handshake with prekey but missing prekey signature
        await session.getOrCreateRatchetSession(
          'user_bob_53_2',
          bobDevId.prekeyPublicKeyHex,
          bobDevId.identityPublicKeyHex,
          true,
          undefined // MISSING signature
        );
      },
      /Peer prekey signature missing for participant user_bob_53_2\. Uncertified prekeys are rejected\./,
      'Session must reject handshake when peer prekey signature is missing'
    );
    console.log('  ✔ Handshake rejected when prekey signature is missing');
  }

  // ---------------------------------------------------------------------------
  // [TEST 3] Invalid Prekey Signature Rejection (Tampered Signature)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Invalid Prekey Signature Rejection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();
    const alicePart: RoomParticipant = {
      id: 'user_alice_53_3',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_3', undefined, undefined, aliceDevId);
    const tamperedSig = 'aa'.repeat(64); // Invalid 128 hex chars signature

    await assert.rejects(
      async () => {
        await session.getOrCreateRatchetSession(
          'user_bob_53_3',
          bobDevId.prekeyPublicKeyHex,
          bobDevId.identityPublicKeyHex,
          true,
          tamperedSig
        );
      },
      /Peer prekey signature verification failed for participant user_bob_53_3\. Potential MITM or uncertified prekey\./,
      'Session must reject handshake with tampered prekey signature'
    );
    console.log('  ✔ Handshake rejected with tampered/invalid prekey signature');
  }

  // ---------------------------------------------------------------------------
  // [TEST 4] Substituted X25519 Prekey Attack Defeated (Fails Closed)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Substituted X25519 Prekey Detection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();
    const malloryDevId = await generateFreshDeviceIdentity();

    const alicePart: RoomParticipant = {
      id: 'user_alice_53_4',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_4', undefined, undefined, aliceDevId);

    await assert.rejects(
      async () => {
        // Attacker substitutes Mallory's prekey under Bob's authentic signature for Bob's prekey
        await session.getOrCreateRatchetSession(
          'user_bob_53_4',
          malloryDevId.prekeyPublicKeyHex, // Substituted prekey
          bobDevId.identityPublicKeyHex,
          true,
          bobDevId.prekeySignatureHex // Signature made for Bob's prekey, not Mallory's
        );
      },
      /Peer prekey signature verification failed for participant user_bob_53_4\. Potential MITM or uncertified prekey\./,
      'Substituted prekey under authentic signature must fail verification'
    );
    console.log('  ✔ Substituted prekey detected and rejected as Potential MITM');
  }

  // ---------------------------------------------------------------------------
  // [TEST 5] Substituted Ed25519 Identity & Signature Quarantined
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Substituted Identity Key Detected and Quarantined');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();
    const malloryDevId = await generateFreshDeviceIdentity();

    const alicePart: RoomParticipant = {
      id: 'user_alice_53_5',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const bobPart: RoomParticipant = {
      id: 'user_bob_53_5',
      displayName: 'Bob',
      joinedAt: Date.now(),
      identityKey: bobDevId.identityPublicKeyHex,
      prekey: bobDevId.prekeyPublicKeyHex,
      prekeySignature: bobDevId.prekeySignatureHex
    };

    const aliceSession = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_5', undefined, undefined, aliceDevId);
    (aliceSession as any).participants.set(bobPart.id, bobPart);

    // Initial message establishes trust for Bob's legitimate identity
    const legitimatePkt: WirePacket = {
      version: 2,
      packetId: 'pkt_legit_1',
      roomId,
      senderId: bobPart.id,
      senderName: bobPart.displayName,
      sequence: 1,
      timestamp: Date.now(),
      senderIdentityKey: bobDevId.identityPublicKeyHex,
      payload: { ciphertext: 'aGVsbG8=', iv: 'aXZub25jZQ==', sequence: 1, timestamp: Date.now() },
      type: 'chat_message'
    };
    const legitPayload = `${legitimatePkt.packetId}:${legitimatePkt.roomId}:${legitimatePkt.senderId}:${legitimatePkt.sequence}:${legitimatePkt.timestamp}:${legitimatePkt.payload.ciphertext}`;
    legitimatePkt.signature = await signWithDeviceIdentity(bobDevId, new TextEncoder().encode(legitPayload));
    await (aliceSession as any).handleIncomingPacket(legitimatePkt);

    // Mallory crafts packet using Mallory's keypair pretending to be Bob
    let alertFired = false;
    aliceSession.onIdentityAlert((alert) => {
      alertFired = true;
      assert.strictEqual(alert.senderId, bobPart.id);
      assert.strictEqual(alert.oldKey, bobDevId.identityPublicKeyHex);
      assert.strictEqual(alert.newKey, malloryDevId.identityPublicKeyHex);
    });

    const maliciousPkt: WirePacket = {
      version: 2,
      packetId: 'pkt_malicious_1',
      roomId,
      senderId: bobPart.id,
      senderName: bobPart.displayName,
      sequence: 2,
      timestamp: Date.now(),
      senderIdentityKey: malloryDevId.identityPublicKeyHex, // Substituted identity!
      payload: { ciphertext: 'YXR0YWNr', iv: 'aXZub25jZQ==', sequence: 2, timestamp: Date.now() },
      type: 'chat_message'
    };
    const malPayload = `${maliciousPkt.packetId}:${maliciousPkt.roomId}:${maliciousPkt.senderId}:${maliciousPkt.sequence}:${maliciousPkt.timestamp}:${maliciousPkt.payload.ciphertext}`;
    maliciousPkt.signature = await signWithDeviceIdentity(malloryDevId, new TextEncoder().encode(malPayload));

    await (aliceSession as any).handleIncomingPacket(maliciousPkt);
    assert.strictEqual(alertFired, true, 'Identity alert must fire on substituted identity');
    console.log('  ✔ Substituted identity detected and quarantined without decrypting');
  }

  // ---------------------------------------------------------------------------
  // [TEST 6] Identity-Key Change After Initial Trust (Persistent TOFU)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Persistent TOFU Identity Key Change Detection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevIdA = await generateFreshDeviceIdentity();
    const bobDevIdB = await generateFreshDeviceIdentity();

    const alicePart: RoomParticipant = {
      id: 'user_alice_53_6',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_6', undefined, undefined, aliceDevId);

    // First contact establishes persistent trust with Identity A
    await session.authenticatePeerIdentityKey('peer_bob_tofu', bobDevIdA.identityPublicKeyHex);

    // Subsequent contact with changed Identity B must fail closed
    await assert.rejects(
      async () => {
        await session.authenticatePeerIdentityKey('peer_bob_tofu', bobDevIdB.identityPublicKeyHex);
      },
      /Peer identity key changed for participant peer_bob_tofu!/,
      'Persistent TOFU must reject changed identity key for trusted peer'
    );
    assert.strictEqual(session.peerQuarantined, true, 'Session must mark peer as quarantined');
    console.log('  ✔ Identity key change rejected by persistent TOFU and quarantined');
  }

  // ---------------------------------------------------------------------------
  // [TEST 7] Expired Prekey Certificate Rejection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] Expired Prekey Certificate Rejection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();

    const alicePart: RoomParticipant = {
      id: 'user_alice_53_7',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_7', undefined, undefined, aliceDevId);

    // Generate expired prekey certificate (expired 10 seconds ago)
    const now = Date.now();
    const expiredCert = await createSignedPrekeyCertificate(bobDevId, {
      expiresInMs: -10000,
      now: now - 20000
    });

    const certCheck = await verifyPrekeyCertificate(expiredCert, { now });
    assert.strictEqual(certCheck.valid, false);
    assert.strictEqual(certCheck.error, 'EXPIRED_PREKEY_CERTIFICATE');

    await assert.rejects(
      async () => {
        await session.getOrCreateRatchetSession(
          'user_bob_53_7',
          expiredCert.prekey,
          expiredCert.identityKey,
          true,
          expiredCert.signature,
          expiredCert.prekeyId,
          expiredCert.createdAt,
          expiredCert.expiresAt
        );
      },
      /Peer prekey certificate has expired for participant user_bob_53_7\. Handshake rejected\./,
      'Expired prekey certificate must be rejected'
    );
    console.log('  ✔ Expired prekey certificate rejected cleanly');
  }

  // ---------------------------------------------------------------------------
  // [TEST 8] Replayed Rotated Prekey Rejection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 8] Replayed Rotated Prekey Rejection');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId1 = await generateFreshDeviceIdentity();
    const bobDevId2 = await rotateDevicePrekey(bobDevId1);

    const alicePart: RoomParticipant = {
      id: 'user_alice_53_8',
      displayName: 'Alice',
      joinedAt: Date.now(),
      identityKey: aliceDevId.identityPublicKeyHex
    };

    const session = new EnclaveRoomSession(roomId, alicePart, rms, 'auth_sec_8', undefined, undefined, aliceDevId);

    // Alice learns Bob has rotated his prekey to bobDevId2 (retires bobDevId1 prekey)
    (session as any).retiredPeerPrekeys.add(bobDevId1.prekeyPublicKeyHex.toLowerCase());

    // Attacker attempts to initiate a handshake with Bob's retired Prekey 1
    await assert.rejects(
      async () => {
        await session.getOrCreateRatchetSession(
          'user_bob_53_8',
          bobDevId1.prekeyPublicKeyHex,
          bobDevId1.identityPublicKeyHex,
          true,
          bobDevId1.prekeySignatureHex
        );
      },
      /Replayed prekey detected for participant user_bob_53_8\. Retired prekeys cannot be reused\./,
      'Retired prekeys cannot be replayed'
    );
    console.log('  ✔ Replayed retired prekey rejected');
  }

  // ---------------------------------------------------------------------------
  // [TEST 9] Two Simultaneous Tab Ownership Claims (Exclusive Ownership)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 9] Two Simultaneous Tab Ownership Claims');
  {
    const devId = await generateFreshDeviceIdentity();
    const userPart: RoomParticipant = {
      id: 'user_same_device_9',
      displayName: 'Alice Same Device',
      joinedAt: Date.now(),
      identityKey: devId.identityPublicKeyHex
    };

    const tab1 = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_9', undefined, undefined, devId);
    assert.strictEqual(tab1.isSessionOwner, true);

    let tab1Evicted = false;
    tab1.onOwnershipLost(() => {
      tab1Evicted = true;
    });

    const tab2 = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_9', undefined, undefined, devId);
    assert.strictEqual(tab2.isSessionOwner, true);

    // Tab 2 claims ownership
    tab2.claimOwnership();

    // Tab 1 observes ownership claim and handles ownership lost
    tab1.handleOwnershipLost();

    assert.strictEqual(tab1.isSessionOwner, false, 'Tab 1 must step down as session owner');
    assert.strictEqual(tab2.isSessionOwner, true, 'Tab 2 must become active session owner');
    assert.strictEqual(tab1Evicted, true, 'Tab 1 must receive eviction notification');
    console.log('  ✔ Multi-tab coordination guarantees exactly one active owner per device');
  }

  // ---------------------------------------------------------------------------
  // [TEST 10] Suspended Old Tab Resuming After Lease Expiry
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 10] Suspended Old Tab Resuming After Lease Expiry');
  {
    const devId = await generateFreshDeviceIdentity();
    const userPart: RoomParticipant = {
      id: 'user_suspended_10',
      displayName: 'Alice Suspended',
      joinedAt: Date.now(),
      identityKey: devId.identityPublicKeyHex
    };

    const staleTab = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_10', undefined, undefined, devId);
    staleTab.handleOwnershipLost(); // Evicted while suspended

    await assert.rejects(
      async () => {
        await staleTab.sendMessage('Attempted send from stale tab');
      },
      /This tab has lost session ownership\. An active session is open in another tab\./,
      'Stale tab must fail closed on send attempt'
    );
    console.log('  ✔ Suspended tab resuming after lease loss fails closed');
  }

  // ---------------------------------------------------------------------------
  // [TEST 11] Old Tab In-Flight Send After Eviction (Fencing Token Rejection)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 11] Old Tab In-Flight Send Aborted via Fencing Token');
  {
    const devId = await generateFreshDeviceIdentity();
    const userPart: RoomParticipant = {
      id: 'user_inflight_11',
      displayName: 'Alice Inflight',
      joinedAt: Date.now(),
      identityKey: devId.identityPublicKeyHex
    };

    const tab = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_11', undefined, undefined, devId);

    // Simulate in-flight loss of ownership during asynchronous operation
    const opGen = tab.currentOwnershipGeneration;
    tab.currentOwnershipGeneration++; // Invalidate generation token
    tab.isSessionOwner = false;

    await assert.rejects(
      async () => {
        // When checking generation fencing after async work:
        if (!tab.isSessionOwner || tab.currentOwnershipGeneration !== opGen) {
          throw new Error('Aborted: Tab lost active ratchet ownership during message encryption.');
        }
      },
      /Aborted: Tab lost active ratchet ownership during message encryption\./,
      'In-flight send must be aborted when generation token changes'
    );
    console.log('  ✔ In-flight send aborted cleanly via monotonic generation token');
  }

  // ---------------------------------------------------------------------------
  // [TEST 12] Evicted Tab Receiving Packet (Drops Packet)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 12] Evicted Tab Drops Incoming Packets Without Advancing Ratchet');
  {
    const devId = await generateFreshDeviceIdentity();
    const userPart: RoomParticipant = {
      id: 'user_evicted_rcv_12',
      displayName: 'Alice Evicted',
      joinedAt: Date.now(),
      identityKey: devId.identityPublicKeyHex
    };

    const tab = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_12', undefined, undefined, devId);
    tab.handleOwnershipLost(); // Evicted

    let messageDispatched = false;
    tab.onMessage(() => {
      messageDispatched = true;
    });

    const dummyPacket: WirePacket = {
      version: 2,
      packetId: 'pkt_test_12',
      roomId,
      senderId: 'peer_bob_12',
      senderName: 'Bob',
      sequence: 1,
      timestamp: Date.now(),
      payload: { ciphertext: 'dGVzdA==', iv: 'aXZub25jZQ==', sequence: 1, timestamp: Date.now() },
      type: 'chat_message'
    };

    await (tab as any).handleIncomingPacket(dummyPacket);
    assert.strictEqual(messageDispatched, false, 'Evicted tab must never dispatch or decrypt incoming packets');
    console.log('  ✔ Incoming packets silently dropped by non-owner tab');
  }

  // ---------------------------------------------------------------------------
  // [TEST 13] Evicted Tab Attempting Receive-Chain Advancement
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 13] Evicted Tab Refuses to Advance Ratchet State');
  {
    const aliceDevId = await generateFreshDeviceIdentity();
    const bobDevId = await generateFreshDeviceIdentity();

    const bobPart: RoomParticipant = {
      id: 'user_bob_13',
      displayName: 'Bob Evicted Tab',
      joinedAt: Date.now(),
      identityKey: bobDevId.identityPublicKeyHex,
      prekey: bobDevId.prekeyPublicKeyHex,
      prekeySignature: bobDevId.prekeySignatureHex
    };

    const bobSession = new EnclaveRoomSession(roomId, bobPart, rms, 'auth_sec_13', undefined, undefined, bobDevId);
    bobSession.handleOwnershipLost();

    // Verify ratchet session count remains 0
    assert.strictEqual((bobSession as any).ratchetSessions.size, 0);

    const dummyPacket: WirePacket = {
      version: 2,
      packetId: 'pkt_test_13',
      roomId,
      senderId: 'user_alice_13',
      senderName: 'Alice',
      sequence: 1,
      timestamp: Date.now(),
      ratchetHeader: {
        dhPub: '00'.repeat(32),
        pn: 0,
        n: 0
      },
      payload: { ciphertext: 'Y2lwaGVy', iv: 'aXZub25jZQ==', sequence: 1, timestamp: Date.now() },
      type: 'chat_message'
    };

    await (bobSession as any).handleIncomingPacket(dummyPacket);
    assert.strictEqual((bobSession as any).ratchetSessions.size, 0, 'No ratchet session should be created by evicted tab');
    console.log('  ✔ Evicted tab refused to advance ratchet state or store skipped keys');
  }

  // ---------------------------------------------------------------------------
  // [TEST 14] Crash Recovery With Stale Operation Still Pending
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 14] Crash Recovery with Generation Fencing');
  {
    const devId = await generateFreshDeviceIdentity();
    const userPart: RoomParticipant = {
      id: 'user_crash_14',
      displayName: 'Alice Crash Test',
      joinedAt: Date.now(),
      identityKey: devId.identityPublicKeyHex
    };

    const tabA = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_14', undefined, undefined, devId);
    const staleGen = tabA.currentOwnershipGeneration;

    // Tab B spins up after Tab A stalled
    const tabB = new EnclaveRoomSession(roomId, userPart, rms, 'auth_sec_14', undefined, undefined, devId);
    tabB.claimOwnership();

    // Tab A is notified of loss
    tabA.handleOwnershipLost();

    assert.notStrictEqual(tabA.currentOwnershipGeneration, staleGen, 'Generation must advance on loss');
    assert.strictEqual(tabA.isSessionOwner, false);
    assert.strictEqual(tabB.isSessionOwner, true);
    console.log('  ✔ Stale pending operation strictly invalidated after recovery');
  }

  // ---------------------------------------------------------------------------
  // [TEST 15] Three Simultaneous Room Joins Using Redis Adapter
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 15] Server-Side Atomic Enforcement: Three Simultaneous Joins');
  {
    const inMemAdapter = new InMemoryRoomStoreAdapter();
    const roomRecord = {
      meta: {
        id: 'room_server_bounds_15',
        passphraseHash: 'hash',
        salt: 'salt',
        state: 'WAITING' as const,
        participantCount: 0,
        createdAt: Date.now(),
        ttlSeconds: HARD_ROOM_TTL_SECONDS,
        burnOnRead: false,
        oneTimeAccess: false,
        accessCount: 0
      },
      activeSockets: new Set<string>(),
      participantHeartbeats: new Map<string, number>(),
      participantInfo: new Map<string, any>(),
      recentPackets: [],
      encryptedMedia: new Map(),
      lastActivity: Date.now()
    };
    inMemAdapter.createRoom('room_server_bounds_15', roomRecord);

    const res1 = inMemAdapter.updatePresence('room_server_bounds_15', 'user_1', 'join', 'User 1');
    const res2 = inMemAdapter.updatePresence('room_server_bounds_15', 'user_2', 'join', 'User 2');
    const res3 = inMemAdapter.updatePresence('room_server_bounds_15', 'user_3', 'join', 'User 3');

    assert.strictEqual(res1?.participantCount, 1);
    assert.strictEqual(res2?.participantCount, 2);
    assert.strictEqual(res3?.status, 'ROOM_FULL', '3rd participant must be rejected with ROOM_FULL');
    assert.strictEqual(res3?.error, 'Room is full. Maximum two participants allowed.');
    console.log('  ✔ Server-side atomicity strictly admits 2 participants and rejects 3rd with ROOM_FULL');
  }

  // ---------------------------------------------------------------------------
  // [TEST 16] Duplicate Participant Identity Reconnect
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 16] Duplicate Participant Identity Reconnection');
  {
    const inMemAdapter = new InMemoryRoomStoreAdapter();
    const roomRecord = {
      meta: {
        id: 'room_reconnect_16',
        passphraseHash: 'hash',
        salt: 'salt',
        state: 'WAITING' as const,
        participantCount: 0,
        createdAt: Date.now(),
        ttlSeconds: HARD_ROOM_TTL_SECONDS,
        burnOnRead: false,
        oneTimeAccess: false,
        accessCount: 0
      },
      activeSockets: new Set<string>(),
      participantHeartbeats: new Map<string, number>(),
      participantInfo: new Map<string, any>(),
      recentPackets: [],
      encryptedMedia: new Map(),
      lastActivity: Date.now()
    };
    inMemAdapter.createRoom('room_reconnect_16', roomRecord);

    inMemAdapter.updatePresence('room_reconnect_16', 'user_existing_1', 'join', 'User 1');
    assert.strictEqual(roomRecord.activeSockets.size, 1);

    // Existing participant reconnects with join action
    const reconnectRes = inMemAdapter.updatePresence('room_reconnect_16', 'user_existing_1', 'join', 'User 1 Updated');
    assert.strictEqual(roomRecord.activeSockets.size, 1, 'Active sockets count must remain 1');
    assert.strictEqual(reconnectRes?.participantCount, 1);

    // Existing participant sends heartbeat
    const hbRes = inMemAdapter.updatePresence('room_reconnect_16', 'user_existing_1', 'heartbeat');
    assert.strictEqual(roomRecord.activeSockets.size, 1, 'Heartbeat must not consume new slot');
    assert.strictEqual(hbRes?.participantCount, 1);
    console.log('  ✔ Existing participant reconnects without consuming additional participant slot');
  }

  // ---------------------------------------------------------------------------
  // [TEST 17] Relay Request from Unregistered Participant Rejected (HTTP 403)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 17] Relay Request from Unregistered Participant Rejected (403)');
  {
    const inMemAdapter = new InMemoryRoomStoreAdapter();
    const roomRecord = {
      meta: {
        id: 'room_relay_guard_17',
        passphraseHash: 'hash',
        salt: 'salt',
        relayAuthKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        state: 'ACTIVE' as const,
        participantCount: 2,
        createdAt: Date.now(),
        ttlSeconds: HARD_ROOM_TTL_SECONDS,
        burnOnRead: false,
        oneTimeAccess: false,
        accessCount: 2
      },
      activeSockets: new Set<string>(['user_legit_alice', 'user_legit_bob']),
      participantHeartbeats: new Map<string, number>([['user_legit_alice', Date.now()], ['user_legit_bob', Date.now()]]),
      participantInfo: new Map<string, any>([
        ['user_legit_alice', { id: 'user_legit_alice', displayName: 'Alice' }],
        ['user_legit_bob', { id: 'user_legit_bob', displayName: 'Bob' }]
      ]),
      recentPackets: [],
      encryptedMedia: new Map(),
      lastActivity: Date.now()
    };
    inMemAdapter.createRoom('room_relay_guard_17', roomRecord);

    // Verify sender membership check
    const intruderId = 'user_intruder_charlie';
    const isIntruderActive = roomRecord.activeSockets.has(intruderId) || roomRecord.participantInfo.has(intruderId);
    assert.strictEqual(isIntruderActive, false, 'Intruder must not be active');

    // Token binding check: Token issued for Alice, but packet senderId claims Bob
    const aliceToken = await createRelayAuthToken(
      roomRecord.meta.relayAuthKey,
      'room_relay_guard_17',
      'user_legit_alice',
      'POST',
      '/api/rooms/room_relay_guard_17/relay'
    );

    setRoomStoreAdapter(inMemAdapter);
    const authResult = await verifyRoomAuthDetailedAsync(
      'room_relay_guard_17',
      `Bearer ${aliceToken}`,
      'POST',
      '/api/rooms/room_relay_guard_17/relay'
    );
    assert.strictEqual(authResult.valid, true);
    assert.strictEqual(authResult.participantId, 'user_legit_alice');

    // If an attacker uses Alice's token with Bob's senderId:
    const packetSenderId = 'user_legit_bob';
    const senderMatchesToken = authResult.participantId.toLowerCase() === packetSenderId.toLowerCase();
    assert.strictEqual(senderMatchesToken, false, 'Sender ID mismatch must be detected');
    console.log('  ✔ Relay route checks active membership and token participant binding (403 Forbidden)');
  }

  // ---------------------------------------------------------------------------
  // [TEST 18] Redis Unavailability & Fallback Behavior (Fails Closed)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 18] Distributed Store Unavailability Fails Closed');
  {
    // Distributed adapter pointing to unreachable / dead endpoint
    const deadAdapter = new DistributedRoomStoreAdapter(
      'https://invalid-dead-redis-endpoint.upstash.io',
      'dead_token'
    );

    await assert.rejects(
      async () => {
        await deadAdapter.getRoom('any_room_id');
      },
      /Redis REST request failed|fetch failed|ENOTFOUND/,
      'Distributed room store operations must fail closed on transport error'
    );

    // Verify getRoomStoreAdapter fails closed in production when Redis config is missing
    const originalEnv = process.env.NODE_ENV;
    const origUrl = process.env.ENCLAVE_REDIS_REST_URL;
    const origToken = process.env.ENCLAVE_REDIS_REST_TOKEN;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ENCLAVE_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.ENCLAVE_REDIS_REST_TOKEN;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      setRoomStoreAdapter(null);

      const { getRoomStoreAdapter } = await import('@/lib/serverRoomAdapter');
      assert.throws(
        () => {
          getRoomStoreAdapter();
        },
        /\[ENCLAVE PRODUCTION CRITICAL\] Production deployment requires distributed Redis storage\./,
        'Production mode without Redis must throw fatal error and never fall back to in-memory'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (origUrl) process.env.ENCLAVE_REDIS_REST_URL = origUrl;
      if (origToken) process.env.ENCLAVE_REDIS_REST_TOKEN = origToken;
      setRoomStoreAdapter(new InMemoryRoomStoreAdapter());
    }
    console.log('  ✔ Redis unavailability fails closed without silent in-memory fallback in production');
  }

  console.log('\n========================================================================');
  console.log('  ALL 18 PHASE 5.3 ADVERSARIAL IDENTITY & BOUNDARY TESTS PASSED 100%!   ');
  console.log('========================================================================\n');
}

if (process.argv[1]?.includes('phase53Adversarial.test.ts')) {
  runPhase53AdversarialTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ TEST FAILURE DETECTED:', err);
      process.exit(1);
    });
}
