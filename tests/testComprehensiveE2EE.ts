import assert from 'node:assert';
import {
  createServerRoom,
  getServerRoom,
  updateRoomPresence,
  pushEncryptedPacket,
  getEncryptedPackets,
  verifyRoomAuth,
  destroyServerRoom,
  roomStore
} from '../src/lib/serverRoomStore.ts';
import {
  deriveRoomKeys,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  deriveEphemeralSessionKey,
  encryptMessage,
  decryptMessage,
  getOpenAccessPassphrase,
  timingSafeEqual,
  generateSecureId
} from '../packages/crypto/index.ts';
import { GET as roomMetaGet } from '../src/app/api/rooms/[roomId]/route.ts';
import { POST as relayPost, GET as relayGet } from '../src/app/api/rooms/[roomId]/relay/route.ts';
import { POST as presencePost } from '../src/app/api/rooms/[roomId]/presence/route.ts';

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('   ENCLAVE POST-FIX CRYPTOGRAPHIC COMPATIBILITY VERIFICATION   ');
  console.log('===============================================================');

  // -------------------------------------------------------------
  // TEST 1: Passwordless (Open Access) Room Full Two-Client Flow
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Passwordless Room: Host Creation & Second-Client Join');
  const openRoomId = '8a2f-9c01';
  const openPass = getOpenAccessPassphrase(openRoomId);
  const hostOpenKeys = await deriveRoomKeys(openPass);
  const { roomMasterSecret: hostOpenRms, wrappedBundle: openWrappedBundle } =
    await createAndWrapRoomSecret(hostOpenKeys.keyWrappingKey);

  // 1a. Host creates room on server
  const serverOpenMeta = createServerRoom(
    openRoomId,
    hostOpenKeys.salt,
    hostOpenKeys.authCommitment,
    openWrappedBundle,
    false,
    false,
    'without_pass'
  );
  assert.strictEqual(serverOpenMeta.requirePass, false);
  assert.strictEqual(serverOpenMeta.accessMode, 'without_pass');

  // 1b. Host registers presence
  const hostId = 'user_host_101';
  const hostPresenceRes = await presencePost(
    new Request(`http://localhost/api/rooms/${openRoomId}/presence`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${hostOpenKeys.authCommitment}`
      },
      body: JSON.stringify({ action: 'join', participantId: hostId, displayName: 'Host' })
    }),
    { params: Promise.resolve({ roomId: openRoomId }) }
  );
  assert.strictEqual(hostPresenceRes.status, 200);

  // 1c. Guest arrives with ONLY Room ID ('8A2F-9C01' mixed case)
  const guestMetaRes = await roomMetaGet(
    new Request(`http://localhost/api/rooms/${openRoomId}`),
    { params: Promise.resolve({ roomId: openRoomId }) }
  );
  assert.strictEqual(guestMetaRes.status, 200);
  const guestMeta = await guestMetaRes.json();
  assert.strictEqual(guestMeta.requirePass, false);

  // Guest derives keys using normalized room ID and server salt
  const guestOpenPass = getOpenAccessPassphrase(guestMeta.id);
  const guestOpenKeys = await deriveRoomKeys(guestOpenPass, guestMeta.salt);
  assert.ok(timingSafeEqual(guestOpenKeys.authCommitment, guestMeta.authCommitment));

  const guestUnwrappedRms = await unwrapRoomSecret(
    guestOpenKeys.keyWrappingKey,
    guestMeta.wrappedSecretBundle
  );
  assert.deepStrictEqual(Array.from(hostOpenRms), Array.from(guestUnwrappedRms));

  // 1d. Guest joins presence -> transitions to ACTIVE
  const guestId = 'user_guest_102';
  const guestPresenceRes = await presencePost(
    new Request(`http://localhost/api/rooms/${openRoomId}/presence`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${guestOpenKeys.authCommitment}`
      },
      body: JSON.stringify({ action: 'join', participantId: guestId, displayName: 'Guest' })
    }),
    { params: Promise.resolve({ roomId: openRoomId }) }
  );
  assert.strictEqual(guestPresenceRes.status, 200);
  const guestPresData = await guestPresenceRes.json();
  assert.strictEqual(guestPresData.state, 'ACTIVE');
  assert.strictEqual(guestPresData.participantCount, 2);
  console.log('✓ Passwordless Room Creation and Guest Auto-Join Verified');

  // -------------------------------------------------------------
  // TEST 2: Passphrase-Protected Room Full Two-Client Flow & Rejection
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Passphrase-Protected Room: Correct vs Incorrect Pass');
  const passRoomId = '7b4e-1d99';
  const truePassphrase = 'solitary-sanctum-quantum-zenith';
  const hostPassKeys = await deriveRoomKeys(truePassphrase);
  const { roomMasterSecret: hostPassRms, wrappedBundle: passWrappedBundle } =
    await createAndWrapRoomSecret(hostPassKeys.keyWrappingKey);

  createServerRoom(
    passRoomId,
    hostPassKeys.salt,
    hostPassKeys.authCommitment,
    passWrappedBundle,
    false,
    true,
    'with_pass'
  );

  // 2a. Wrong passphrase test
  const wrongPassphrase = 'wrong-password-guess';
  const attackerKeys = await deriveRoomKeys(wrongPassphrase, hostPassKeys.salt);
  assert.strictEqual(
    timingSafeEqual(attackerKeys.authCommitment, hostPassKeys.authCommitment),
    false,
    'Wrong passphrase must NOT match authCommitment'
  );

  let unwrappedWrongSucceeded = false;
  try {
    await unwrapRoomSecret(attackerKeys.keyWrappingKey, passWrappedBundle);
    unwrappedWrongSucceeded = true;
  } catch {
    unwrappedWrongSucceeded = false;
  }
  assert.strictEqual(unwrappedWrongSucceeded, false, 'Unwrapping RMS with wrong KWK must fail');

  // 2b. Correct passphrase guest join
  const validGuestKeys = await deriveRoomKeys(truePassphrase, hostPassKeys.salt);
  assert.ok(timingSafeEqual(validGuestKeys.authCommitment, hostPassKeys.authCommitment));

  const validGuestRms = await unwrapRoomSecret(validGuestKeys.keyWrappingKey, passWrappedBundle);
  assert.deepStrictEqual(Array.from(hostPassRms), Array.from(validGuestRms));
  console.log('✓ Passphrase-Protected Room: Correct pass verified & Wrong pass safely rejected');

  // -------------------------------------------------------------
  // TEST 3: Bidirectional E2EE Messaging & Server Blindness
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Bidirectional E2EE Message Relay & Server Ciphertext Inspection');
  const hostSenderKey = await deriveEphemeralSessionKey(hostPassRms, hostId);
  const guestReceiverKey = await deriveEphemeralSessionKey(validGuestRms, hostId);

  const guestSenderKey = await deriveEphemeralSessionKey(validGuestRms, guestId);
  const hostReceiverKey = await deriveEphemeralSessionKey(hostPassRms, guestId);

  // 3a. Host sends message
  const hostPlaintext = 'Confidential message from Host: Project Pegasus is go.';
  const hostEncryptedPayload = await encryptMessage(
    hostSenderKey,
    hostPlaintext,
    passRoomId,
    'pkt_001',
    hostId,
    1,
    Date.now(),
    1
  );

  const hostPostRes = await relayPost(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${hostPassKeys.authCommitment}`
      },
      body: JSON.stringify({
        version: 1,
        packetId: 'pkt_001',
        roomId: passRoomId,
        senderId: hostId,
        senderName: 'Host',
        sequence: 1,
        timestamp: Date.now(),
        payload: hostEncryptedPayload,
        type: 'chat_message'
      })
    }),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(hostPostRes.status, 200);

  // 3b. Inspect server storage: verify server holds ONLY ciphertext
  const serverPackets = getEncryptedPackets(passRoomId);
  assert.strictEqual(serverPackets.length, 1);
  const storedPkt = serverPackets[0];
  assert.strictEqual(storedPkt.packetId, 'pkt_001');
  assert.ok(storedPkt.payload.ciphertext);
  assert.ok(storedPkt.payload.iv);
  // Verify plaintext does NOT exist anywhere in server packet
  const serverJsonString = JSON.stringify(storedPkt);
  assert.strictEqual(serverJsonString.includes('Project Pegasus'), false, 'Server MUST NOT hold plaintext');

  // 3c. Guest polls and decrypts Host message
  const guestPollRes = await relayGet(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay?since=0`, {
      headers: { 'authorization': `Bearer ${validGuestKeys.authCommitment}` }
    }),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(guestPollRes.status, 200);
  const guestPollData = await guestPollRes.json();
  assert.strictEqual(guestPollData.packets.length, 1);

  const decryptedByGuest = await decryptMessage(
    guestReceiverKey,
    guestPollData.packets[0].payload,
    passRoomId,
    'pkt_001',
    hostId,
    1
  );
  assert.strictEqual(decryptedByGuest, hostPlaintext);

  // 3d. Guest replies to Host
  const guestReplyPlaintext = 'Acknowledged Host. Deploying encrypted payload.';
  const guestEncryptedPayload = await encryptMessage(
    guestSenderKey,
    guestReplyPlaintext,
    passRoomId,
    'pkt_002',
    guestId,
    1,
    Date.now(),
    1
  );

  const guestPostRes = await relayPost(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${validGuestKeys.authCommitment}`
      },
      body: JSON.stringify({
        version: 1,
        packetId: 'pkt_002',
        roomId: passRoomId,
        senderId: guestId,
        senderName: 'Guest',
        sequence: 1,
        timestamp: Date.now(),
        payload: guestEncryptedPayload,
        type: 'chat_message'
      })
    }),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(guestPostRes.status, 200);

  // 3e. Host polls and decrypts Guest reply
  const hostPollRes = await relayGet(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay?since=0`, {
      headers: { 'authorization': `Bearer ${hostPassKeys.authCommitment}` }
    }),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(hostPollRes.status, 200);
  const hostPollData = await hostPollRes.json();
  assert.strictEqual(hostPollData.packets.length, 2);

  const decryptedByHost = await decryptMessage(
    hostReceiverKey,
    hostPollData.packets[1].payload,
    passRoomId,
    'pkt_002',
    guestId,
    1
  );
  assert.strictEqual(decryptedByHost, guestReplyPlaintext);
  console.log('✓ Bidirectional E2EE Message Relay & Strict Server Blindness Verified');

  // -------------------------------------------------------------
  // TEST 4: Relay Authorization & Cross-Room Isolation
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Relay Authorization & Cross-Room Isolation');
  // 4a. Request without bearer token -> 401
  const unauthReq = await relayGet(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay?since=0`),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(unauthReq.status, 401);

  // 4b. Request with Room A token to Room B -> 401
  const crossRoomReq = await relayGet(
    new Request(`http://localhost/api/rooms/${passRoomId}/relay?since=0`, {
      headers: { 'authorization': `Bearer ${hostOpenKeys.authCommitment}` }
    }),
    { params: Promise.resolve({ roomId: passRoomId }) }
  );
  assert.strictEqual(crossRoomReq.status, 401);

  // 4c. Tampered ciphertext payload decryption -> throws AES-GCM tag mismatch
  let tamperedDecryptionSucceeded = false;
  try {
    const tamperedPayload = {
      ...guestPollData.packets[0].payload,
      ciphertext: 'AAAA' + guestPollData.packets[0].payload.ciphertext.slice(4)
    };
    await decryptMessage(guestReceiverKey, tamperedPayload, passRoomId, 'pkt_001', hostId, 1);
    tamperedDecryptionSucceeded = true;
  } catch {
    tamperedDecryptionSucceeded = false;
  }
  assert.strictEqual(tamperedDecryptionSucceeded, false, 'Tampered ciphertext MUST fail AES-GCM auth tag verification');

  console.log('✓ Relay Authorization, Cross-Room Isolation & Tamper Resistance Verified');

  console.log('\n===============================================================');
  console.log('   ALL POST-FIX CRYPTOGRAPHIC VERIFICATION CHECKS PASSED!      ');
  console.log('===============================================================');
}

runComprehensiveVerification().catch(err => {
  console.error('\n❌ COMPREHENSIVE VERIFICATION FAILED:', err);
  process.exit(1);
});
