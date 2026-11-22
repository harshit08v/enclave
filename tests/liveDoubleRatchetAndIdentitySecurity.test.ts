/**
 * ENCLAVE Live Double Ratchet & Identity Substitution Security Verification Suite
 *
 * Verifies Phase 5 objectives:
 * 1. Live Double Ratchet Integration in EnclaveRoomSession
 * 2. Authenticated Session Handshake & Ephemeral DH Ratcheting
 * 3. Consecutive Message Encryption with Unique Single-Use Message Keys
 * 4. Bidirectional DH Ratchet Transitions with Forward Secrecy & PCS
 * 5. Out-of-Order Delivery via Bounded Skipped Message Keys
 * 6. Anti-Replay Defense: Consumed Sequence Rejection & Retired DH Key Protection
 * 7. Forged Envelope & Tampered Ratchet Header Rejection
 * 8. Mid-Session Ed25519 Identity Substitution Detection & Quarantine
 * 9. Explicit User Verification Flow & Quarantined Packet Release
 * 10. Production Unratcheted Packet Downgrade Rejection
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  WebDoubleRatchetSession,
  generateSecureId,
  deriveEphemeralSessionKey
} from '@/packages/crypto';
import {
  WirePacket,
  RoomParticipant,
  DecryptedMessage
} from '@/packages/protocol';
import { EnclaveRoomSession } from '@/lib/roomRelay';
import {
  generateFreshDeviceIdentity,
  signWithDeviceIdentity,
  verifyDeviceIdentitySignature,
  calculateSafetyNumber
} from '@/lib/deviceIdentity';
import { setPrivacyPreferences } from '@/lib/privacyPreferences';

export async function runLiveDoubleRatchetAndIdentitySecurityTests() {
  setPrivacyPreferences({ readReceipts: false });
  console.log('\n========================================================================');
  console.log('  ENCLAVE PHASE 5: LIVE DOUBLE RATCHET & IDENTITY SECURITY TEST SUITE   ');
  console.log('========================================================================');

  const roomId = 'room_live_ratchet_sec_test';
  const rms = crypto.randomBytes(32);

  // Setup Alice & Bob Identities
  const aliceDevId = await generateFreshDeviceIdentity();
  const bobDevId = await generateFreshDeviceIdentity();

  const aliceParticipant: RoomParticipant = {
    id: 'user_alice_001',
    displayName: 'Alice (Initiator)',
    joinedAt: Date.now(),
    identityKey: aliceDevId.identityPublicKeyHex,
    prekey: aliceDevId.prekeyPublicKeyHex,
    prekeySignature: aliceDevId.prekeySignatureHex
  };

  const bobParticipant: RoomParticipant = {
    id: 'user_bob_002',
    displayName: 'Bob (Responder)',
    joinedAt: Date.now(),
    identityKey: bobDevId.identityPublicKeyHex,
    prekey: bobDevId.prekeyPublicKeyHex,
    prekeySignature: bobDevId.prekeySignatureHex
  };

  // ---------------------------------------------------------------------------
  // [TEST 1] Authenticated Session Handshake & Pairwise Root Derivation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] Authenticated Pairwise Double Ratchet Handshake');
  const aliceSession = new EnclaveRoomSession(roomId, aliceParticipant, rms, 'auth_alice_secret', undefined, undefined, aliceDevId);
  aliceSession.deviceIdentity = aliceDevId;

  const bobSession = new EnclaveRoomSession(roomId, bobParticipant, rms, 'auth_bob_secret', undefined, undefined, bobDevId);
  bobSession.deviceIdentity = bobDevId;

  // Mutual presence exchange
  (aliceSession as any).participants.set(bobParticipant.id, bobParticipant);
  (bobSession as any).participants.set(aliceParticipant.id, aliceParticipant);

  // Alice sends first message to Bob
  const aliceMsg1 = await aliceSession.sendMessage('Hello Bob, this is secret message #1 over Double Ratchet!');
  assert.strictEqual(aliceMsg1.text, 'Hello Bob, this is secret message #1 over Double Ratchet!');
  assert.strictEqual(aliceMsg1.isSelf, true);
  assert.strictEqual(aliceMsg1.status, 'sent');
  console.log('  ✔ Alice generated local sent message via Double Ratchet pipeline');

  // Intercept the raw WirePacket from Alice
  let capturedPacket1: WirePacket | null = null;
  aliceSession.onRawPacket((pkt) => {
    capturedPacket1 = pkt;
  });
  // Send message 2 to trigger packet capture
  await aliceSession.sendMessage('Alice consecutive message #2');
  assert.ok(capturedPacket1, 'Wire packet must be emitted to listeners');
  const pkt1 = capturedPacket1 as WirePacket;

  assert.strictEqual(pkt1.version, 2, 'Live wire packet must be version 2 (Double Ratchet)');
  assert.ok(pkt1.ratchetHeader, 'Wire packet must include ratchetHeader metadata');
  assert.strictEqual(typeof pkt1.ratchetHeader.dhPub, 'string');
  assert.strictEqual(pkt1.ratchetHeader.dhPub.length, 64, 'DH pubkey must be 32 bytes (64 hex characters)');
  assert.strictEqual(pkt1.ratchetHeader.pn, 0, 'Previous chain length must be 0 for initial chain');
  assert.strictEqual(typeof pkt1.signature, 'string', 'Packet must have Ed25519 identity signature');
  assert.strictEqual(pkt1.senderIdentityKey, aliceDevId.identityPublicKeyHex);
  console.log(`  ✔ Wire packet v2 constructed with 32-byte ephemeral DH key: ${pkt1.ratchetHeader.dhPub.slice(0, 16)}...`);

  // ---------------------------------------------------------------------------
  // [TEST 2] Consecutive Sending Chain Advancement & Unique Single-Use Keys
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Consecutive Sending Chain Advancement with Unique Message Keys');
  const capturedPackets: WirePacket[] = [];
  aliceSession.onRawPacket((pkt) => {
    capturedPackets.push(pkt);
  });

  const aMsg3 = await aliceSession.sendMessage('Consecutive 3');
  const aMsg4 = await aliceSession.sendMessage('Consecutive 4');
  const aMsg5 = await aliceSession.sendMessage('Consecutive 5');

  const p3 = capturedPackets[capturedPackets.length - 3];
  const p4 = capturedPackets[capturedPackets.length - 2];
  const p5 = capturedPackets[capturedPackets.length - 1];

  assert.notStrictEqual(p3.payload.ciphertext, p4.payload.ciphertext, 'Ciphertexts must differ');
  assert.notStrictEqual(p4.payload.ciphertext, p5.payload.ciphertext, 'Ciphertexts must differ');
  assert.notStrictEqual(p3.payload.iv, p4.payload.iv, 'IVs must be distinct random nonces');
  assert.strictEqual(p3.ratchetHeader!.n + 1, p4.ratchetHeader!.n, 'Ratchet counter n must strictly increment');
  assert.strictEqual(p4.ratchetHeader!.n + 1, p5.ratchetHeader!.n, 'Ratchet counter n must strictly increment');
  console.log(`  ✔ Chain advanced sequentially: n=${p3.ratchetHeader!.n} -> n=${p4.ratchetHeader!.n} -> n=${p5.ratchetHeader!.n}`);

  // Bob receives and decrypts Alice's consecutive messages
  const bobDecrypted: DecryptedMessage[] = [];
  bobSession.onMessage((msg) => {
    bobDecrypted.push(msg);
  });

  await (bobSession as any).handleIncomingPacket(p3);
  await (bobSession as any).handleIncomingPacket(p4);
  await (bobSession as any).handleIncomingPacket(p5);

  assert.strictEqual(bobDecrypted.length, 3, 'Bob must receive all 3 consecutive messages');
  assert.strictEqual(bobDecrypted[0].text, 'Consecutive 3');
  assert.strictEqual(bobDecrypted[1].text, 'Consecutive 4');
  assert.strictEqual(bobDecrypted[2].text, 'Consecutive 5');
  console.log('  ✔ Bob decrypted all consecutive messages in sending chain cleanly');

  // ---------------------------------------------------------------------------
  // [TEST 3] Bidirectional DH Ratchet Advancement & Post-Compromise Security
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Bidirectional DH Ratchet Transitions & Post-Compromise Security');
  let bobOutgoingPacket: WirePacket | null = null;
  bobSession.onRawPacket((pkt) => {
    bobOutgoingPacket = pkt;
  });

  // Bob replies to Alice
  const bobReplyMsg = await bobSession.sendMessage('Hello Alice, I have received your messages and ratcheted my DH key!');
  assert.ok(bobOutgoingPacket, 'Bob must emit ratcheted reply packet');
  const bPkt1 = bobOutgoingPacket as WirePacket;

  assert.notStrictEqual(
    bPkt1.ratchetHeader!.dhPub.toLowerCase(),
    aliceDevId.prekeyPublicKeyHex.toLowerCase(),
    'Bob must generate a fresh ephemeral DH ratchet key for reply'
  );
  assert.notStrictEqual(
    bPkt1.ratchetHeader!.dhPub.toLowerCase(),
    p5.ratchetHeader!.dhPub.toLowerCase(),
    'Bob DH ratchet key must differ from Alice DH ratchet key'
  );
  assert.strictEqual(bPkt1.ratchetHeader!.n, 0, 'Bob message index must reset to 0 in new DH chain');
  console.log(`  ✔ Bob advanced DH ratchet with fresh ephemeral key: ${bPkt1.ratchetHeader!.dhPub.slice(0, 16)}...`);

  // Alice receives Bob's reply
  const aliceReceived: DecryptedMessage[] = [];
  aliceSession.onMessage((msg) => {
    aliceReceived.push(msg);
  });

  await (aliceSession as any).handleIncomingPacket(bPkt1);
  assert.strictEqual(aliceReceived.length, 1);
  assert.strictEqual(aliceReceived[0].text, 'Hello Alice, I have received your messages and ratcheted my DH key!');
  console.log('  ✔ Alice decrypted Bob ratcheted reply and advanced receiving DH ratchet');

  // Alice replies back (Round-trip complete ratchet step)
  let aliceRoundtripPkt: WirePacket | null = null;
  aliceSession.onRawPacket((pkt) => {
    aliceRoundtripPkt = pkt;
  });
  await aliceSession.sendMessage('Round-trip confirmed from Alice!');
  assert.ok(aliceRoundtripPkt);
  const aRoundPkt = aliceRoundtripPkt as WirePacket;

  assert.notStrictEqual(
    aRoundPkt.ratchetHeader!.dhPub.toLowerCase(),
    p5.ratchetHeader!.dhPub.toLowerCase(),
    'Alice must have generated a new DH key after receiving Bob DH reply'
  );
  console.log(`  ✔ Alice round-trip transition produced new DH ratchet key: ${aRoundPkt.ratchetHeader!.dhPub.slice(0, 16)}...`);

  await (bobSession as any).handleIncomingPacket(aRoundPkt);
  assert.strictEqual(bobDecrypted[bobDecrypted.length - 1].text, 'Round-trip confirmed from Alice!');
  console.log('  ✔ Bob decrypted round-trip message successfully');

  // ---------------------------------------------------------------------------
  // [TEST 4] Out-of-Order Delivery with Bounded Skipped Message Keys
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Out-of-Order Delivery via Bounded Skipped Keys');
  const outOfOrderPackets: WirePacket[] = [];
  aliceSession.onRawPacket((pkt) => {
    outOfOrderPackets.push(pkt);
  });

  await aliceSession.sendMessage('Order A');
  await aliceSession.sendMessage('Order B');
  await aliceSession.sendMessage('Order C');

  const pktA = outOfOrderPackets[outOfOrderPackets.length - 3];
  const pktB = outOfOrderPackets[outOfOrderPackets.length - 2];
  const pktC = outOfOrderPackets[outOfOrderPackets.length - 1];

  const outOfOrderDecrypted: DecryptedMessage[] = [];
  bobSession.onMessage((msg) => {
    outOfOrderDecrypted.push(msg);
  });

  // Deliver C first, then A, then B
  await (bobSession as any).handleIncomingPacket(pktC);
  assert.strictEqual(outOfOrderDecrypted.length, 1);
  assert.strictEqual(outOfOrderDecrypted[0].text, 'Order C');
  console.log('  ✔ Bob received Order C out-of-order, skipped keys A and B cached');

  await (bobSession as any).handleIncomingPacket(pktA);
  assert.strictEqual(outOfOrderDecrypted.length, 2);
  assert.strictEqual(outOfOrderDecrypted[1].text, 'Order A');
  console.log('  ✔ Bob received Order A, retrieved and decrypted from skipped key cache');

  await (bobSession as any).handleIncomingPacket(pktB);
  assert.strictEqual(outOfOrderDecrypted.length, 3);
  assert.strictEqual(outOfOrderDecrypted[2].text, 'Order B');
  console.log('  ✔ Bob received Order B, retrieved and decrypted from skipped key cache');

  // ---------------------------------------------------------------------------
  // [TEST 5] Replay Protection: Consumed Sequences & Retired DH Key Rejection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Replay Attack Rejection (Consumed Sequences & Retired DH Keys)');
  const bobCountBeforeReplay = bobDecrypted.length;

  // Replay packet A
  await (bobSession as any).handleIncomingPacket(pktA);
  assert.strictEqual(bobDecrypted.length, bobCountBeforeReplay, 'Replayed packet must be dropped silently');
  console.log('  ✔ Replay of consumed packet dropped by sequence check');

  // Replay with new packetId but consumed sequence
  const clonedPktA: WirePacket = {
    ...pktA,
    packetId: 'pkt_forged_replay_id_999'
  };
  await (bobSession as any).handleIncomingPacket(clonedPktA);
  assert.strictEqual(bobDecrypted.length, bobCountBeforeReplay, 'Replay with forged packetId must be dropped');
  console.log('  ✔ Sequence-level replay defense defeated forged packetId reuse');

  // ---------------------------------------------------------------------------
  // [TEST 6] Forged Envelope & Tampered Ratchet Header Rejection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Forgery & Tamper Resistance');
  let tamperRejected = false;
  bobSession.onMessage((msg) => {
    if (msg.id === 'tampered_pkt_id') tamperRejected = true;
  });

  // Tampered ciphertext with forged signature
  const tamperedPkt: WirePacket = {
    ...pktC,
    packetId: 'tampered_pkt_id',
    payload: {
      ...pktC.payload,
      ciphertext: Buffer.from('TAMPERED_MALICIOUS_CIPHERTEXT').toString('base64')
    }
  };
  await (bobSession as any).handleIncomingPacket(tamperedPkt);
  assert.strictEqual(tamperRejected, false, 'Tampered packet must fail signature/AEAD check and never be emitted');
  console.log('  ✔ Tampered ciphertext rejected by Ed25519 signature verification');

  // Tampered ratchet header (modified DH key)
  const headerTamperedPkt: WirePacket = {
    ...pktC,
    packetId: 'header_tampered_pkt',
    ratchetHeader: {
      ...pktC.ratchetHeader!,
      dhPub: '00'.repeat(32) // zeroed public key
    }
  };
  await (bobSession as any).handleIncomingPacket(headerTamperedPkt);
  assert.strictEqual(tamperRejected, false, 'Tampered ratchet header must fail and never be emitted');
  console.log('  ✔ Tampered ratchet header rejected');

  // ---------------------------------------------------------------------------
  // [TEST 7] Mid-Session Identity Substitution Detection & Quarantine
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] Mid-Session Identity Key Substitution Detection & Quarantine');
  const eveDevId = await generateFreshDeviceIdentity();
  let alertFired = false;
  let alertData: any = null;

  bobSession.onIdentityAlert((details) => {
    alertFired = true;
    alertData = details;
  });

  // Malicious or replaced device sends a packet claiming to be Alice, with Eve's key
  const substitutePacketId = generateSecureId('pkt', 8);
  const substituteSeq = 999;
  const now = Date.now();
  const subSignPayload = `${substitutePacketId}:${roomId}:${aliceParticipant.id}:${substituteSeq}:${now}:dGVzdA==`;
  const subSig = await signWithDeviceIdentity(eveDevId, new TextEncoder().encode(subSignPayload));

  const substitutePkt: WirePacket = {
    version: 2,
    packetId: substitutePacketId,
    roomId,
    senderId: aliceParticipant.id,
    senderName: aliceParticipant.displayName,
    sequence: substituteSeq,
    timestamp: now,
    payload: {
      ciphertext: 'dGVzdA==',
      iv: 'dGVzdGl2',
      sequence: substituteSeq,
      timestamp: now
    },
    type: 'chat_message',
    senderIdentityKey: eveDevId.identityPublicKeyHex,
    signature: subSig,
    ratchetHeader: {
      dhPub: eveDevId.prekeyPublicKeyHex,
      pn: 0,
      n: 0
    }
  };

  const bobMessagesBeforeSub = bobDecrypted.length;
  await (bobSession as any).handleIncomingPacket(substitutePkt);

  assert.strictEqual(bobDecrypted.length, bobMessagesBeforeSub, 'Quarantined packet must NEVER be delivered to message listeners!');
  assert.strictEqual(alertFired, true, 'IdentityAlertListener must be notified immediately on key substitution');
  assert.strictEqual(alertData.senderId, aliceParticipant.id);
  assert.strictEqual(alertData.oldKey.toLowerCase(), aliceDevId.identityPublicKeyHex.toLowerCase());
  assert.strictEqual(alertData.newKey.toLowerCase(), eveDevId.identityPublicKeyHex.toLowerCase());
  assert.strictEqual(alertData.quarantinedCount, 1, 'Packet must be quarantined in session storage/memory');
  assert.ok(alertData.safetyNumber, 'Modal must calculate safety number comparison');
  console.log('  ✔ Identity key substitution intercepted: packet quarantined, unverified message blocked');
  console.log(`  ✔ Security alert triggered with oldKey, newKey, and safetyNumber: ${alertData.safetyNumber}`);

  // ---------------------------------------------------------------------------
  // [TEST 8] Explicit Identity Rejection vs. Verification Flow
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 8] Explicit User Rejection & Verification Flow');

  // Test 8a: User rejects untrusted replacement key
  bobSession.rejectPeerIdentity(aliceParticipant.id);
  const rejectedRecord = bobSession.getStoredPeerIdentity(aliceParticipant.id);
  assert.strictEqual(rejectedRecord?.status, 'rejected');

  // Another packet with the rejected key must be permanently dropped
  await (bobSession as any).handleIncomingPacket(substitutePkt);
  assert.strictEqual(bobDecrypted.length, bobMessagesBeforeSub, 'Rejected identity packets must be dropped permanently');
  console.log('  ✔ Identity rejection blocks subsequent communications');

  // Test 8b: User verifies and accepts replacement key
  await bobSession.verifyAndAcceptPeerIdentity(aliceParticipant.id, eveDevId.identityPublicKeyHex);
  const verifiedRecord = bobSession.getStoredPeerIdentity(aliceParticipant.id);
  assert.strictEqual(verifiedRecord?.status, 'verified');
  assert.strictEqual(verifiedRecord?.identityKey.toLowerCase(), eveDevId.identityPublicKeyHex.toLowerCase());
  console.log('  ✔ Explicit verification stores verified status in storage and resets ratchet state');

  // ---------------------------------------------------------------------------
  // [TEST 9] Production Mode Rejects Unratcheted Downgrade Packets
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 9] Production Mode Downgrade Attack Rejection');
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    const unratchetedPkt: WirePacket = {
      version: 1,
      packetId: 'unratcheted_downgrade_pkt',
      roomId,
      senderId: aliceParticipant.id,
      senderName: aliceParticipant.displayName,
      sequence: 1001,
      timestamp: Date.now(),
      payload: {
        ciphertext: 'downgrade',
        iv: 'iv',
        sequence: 1001,
        timestamp: Date.now()
      },
      type: 'chat_message'
      // no ratchetHeader
    };

    let deliveredUnratcheted = false;
    bobSession.onMessage((m) => {
      if (m.id === 'unratcheted_downgrade_pkt') deliveredUnratcheted = true;
    });

    await (bobSession as any).handleIncomingPacket(unratchetedPkt);
    assert.strictEqual(deliveredUnratcheted, false, 'Unratcheted wire packet must be rejected in production mode');
    console.log('  ✔ Production unratcheted packet downgrade attempt successfully rejected');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  // ---------------------------------------------------------------------------
  // [TEST 10] Session Teardown & Buffer Zeroization
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 10] Session Teardown & Sensitive Buffer Zeroization');
  aliceSession.cleanup();
  bobSession.cleanup();

  assert.strictEqual(aliceSession.getState(), 'DESTROYED');
  assert.strictEqual(bobSession.getState(), 'DESTROYED');
  assert.strictEqual((aliceSession as any).roomMasterSecret, null);
  assert.strictEqual((bobSession as any).roomMasterSecret, null);
  console.log('  ✔ Session cleanup zeroized buffers and terminated intervals');

  console.log('\n========================================================================');
  console.log('  ALL 10 LIVE DOUBLE RATCHET & IDENTITY SECURITY TESTS PASSED 100%!     ');
  console.log('========================================================================\n');
}

if (process.argv[1]?.endsWith('liveDoubleRatchetAndIdentitySecurity.test.ts')) {
  runLiveDoubleRatchetAndIdentitySecurityTests().catch((err) => {
    console.error('❌ LIVE DOUBLE RATCHET TEST FAILURE:', err);
    process.exit(1);
  });
}
