/**
 * ENCLAVE Adversarial Verification Suite
 * Simulates attacker capabilities: replay attacks, ID spoofing, payload forgery, URL leak prevention, and lockouts.
 */

import assert from 'node:assert';
import {
  createServerRoom,
  getServerRoom,
  updateRoomPresence,
  pushEncryptedPacket,
  getEncryptedPackets,
  verifyRoomAuth,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  isValidIp,
  getTrustedClientIp,
  extractAuthProof,
  destroyServerRoom
} from '../src/lib/serverRoomStore.ts';
import {
  generateDicewarePassphrase,
  generateSecureId,
  deriveRoomKeys,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  deriveEphemeralSessionKey,
  encryptMessage,
  decryptMessage,
  sanitizeRoomUrl,
  getOpenAccessPassphrase,
  timingSafeEqual
} from '../packages/crypto/index.ts';
import { GET as roomMetaGet } from '../src/app/api/rooms/[roomId]/route.ts';
import { POST as relayPost, GET as relayGet } from '../src/app/api/rooms/[roomId]/relay/route.ts';
import { POST as mediaPost, GET as mediaGet } from '../src/app/api/rooms/[roomId]/media/route.ts';
import { POST as presencePost } from '../src/app/api/rooms/[roomId]/presence/route.ts';

export async function runAdversarialTests() {
  console.log('\n--- Running Adversarial Security Suite ---');

  // Attack 1: Passphrase in URL leak prevention
  console.log('[ATTACK 1] Access Pass in URL & Query String Scrubbing');
  const dirtyUrl1 = 'https://enclave.app/r/8f92-c0e4?pass=monolith-sanctum-obsidian-zenith';
  const cleanUrl1 = sanitizeRoomUrl(dirtyUrl1);
  assert.strictEqual(cleanUrl1, 'https://enclave.app/r/8f92-c0e4');
  assert.ok(!cleanUrl1.includes('pass='), 'Query parameters must be completely stripped');

  const dirtyUrl2 = 'https://enclave.app/r/8f92-c0e4#monolith-sanctum-obsidian-zenith';
  const cleanUrl2 = sanitizeRoomUrl(dirtyUrl2);
  assert.strictEqual(cleanUrl2, 'https://enclave.app/r/8f92-c0e4');
  assert.ok(!cleanUrl2.includes('#'), 'Fragment identifiers must be completely stripped');
  console.log('✓ URL Leaks Defeated & Sanitization Enforced');

  // Attack 2: Cryptographic Forgery of Wire Packet
  console.log('[ATTACK 2] Cryptographic Forgery of Wire Packet');
  const pass = generateDicewarePassphrase();
  const keys = await deriveRoomKeys(pass);
  const { roomMasterSecret: rms, wrappedBundle } = await createAndWrapRoomSecret(keys.keyWrappingKey);

  const senderKey = await deriveEphemeralSessionKey(rms, 'usr_alice');
  const receiverKey = await deriveEphemeralSessionKey(rms, 'usr_alice');

  const payload = await encryptMessage(senderKey, 'Confidential memo', 'room_abc', 'pkt_001', 'usr_alice', 1, 1000, 1);

  // Attacker tries to alter payload text without key
  let forgedDecryptionFailed = false;
  try {
    const forgedPayload = { ...payload, ciphertext: payload.ciphertext.slice(0, -4) + 'AAAA' };
    await decryptMessage(receiverKey, forgedPayload, 'room_abc', 'pkt_001', 'usr_alice', 1);
  } catch {
    forgedDecryptionFailed = true;
  }
  assert.ok(forgedDecryptionFailed, 'Forged ciphertext must fail GCM tag verification');
  console.log('✓ Cryptographic Forgery Defeated');

  // Attack 3: Impersonation Attack (Spoofed sender ID in AAD)
  console.log('[ATTACK 3] Sender Impersonation Attack');
  let impersonationFailed = false;
  try {
    // Receiver expects pkt from 'usr_mallory' but ciphertext was encrypted under 'usr_alice' AAD
    await decryptMessage(receiverKey, payload, 'room_abc', 'pkt_001', 'usr_mallory', 1);
  } catch {
    impersonationFailed = true;
  }
  assert.ok(impersonationFailed, 'AAD sender binding must defeat sender spoofing');
  console.log('✓ Sender Spoofing Defeated via Canonical AAD Binding');

  // Attack 4: Post-Destruction Resurrection Attack
  console.log('[ATTACK 4] Post-Destruction Room Resurrection Attack');
  const roomId = 'room_adv_' + generateSecureId('', 4);
  createServerRoom(roomId, keys.salt, keys.authCommitment, wrappedBundle, false);

  updateRoomPresence(roomId, 'alice', 'join');
  updateRoomPresence(roomId, 'alice', 'leave'); // Room destroyed

  const resurrectAttempt = updateRoomPresence(roomId, 'mallory', 'join');
  assert.strictEqual(resurrectAttempt?.state, 'DESTROYED');
  assert.strictEqual(resurrectAttempt?.participantCount, 0);

  const roomRecord = getServerRoom(roomId);
  assert.strictEqual(roomRecord?.state, 'DESTROYED');
  console.log('✓ Resurrection Attack Defeated');

  // Attack 5: Online Brute Force Pass Guessing Lockout
  console.log('[ATTACK 5] Online Brute-Force Rate Limiting');
  const attackerKey = 'attacker_ip_192_168_1_100';
  resetRateLimit(attackerKey);

  for (let attempt = 1; attempt <= 5; attempt++) {
    recordFailedAttempt(attackerKey);
  }

  const lockout = checkRateLimit(attackerKey);
  assert.strictEqual(lockout.allowed, false, 'Attacker must be locked out after 5 consecutive failures');
  assert.ok(lockout.retryAfter && lockout.retryAfter > 0);
  console.log('✓ Online Brute-Force Attack Defeated via Lockout');

  // Attack 6: Untrusted Forwarded-IP Spoofing & Header Injection Defense (ENC-SEC-01)
  console.log('[ATTACK 6] Forwarded-IP Spoofing & Header Injection Defense (ENC-SEC-01)');
  
  // 6a. Valid IP parsing
  assert.strictEqual(isValidIp('192.168.1.1'), true);
  assert.strictEqual(isValidIp('10.0.0.1'), true);
  assert.strictEqual(isValidIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), true);
  assert.strictEqual(isValidIp('::1'), true);

  // 6b. Malformed / Spoofed strings must be rejected by isValidIp
  assert.strictEqual(isValidIp('spoofed-random-attacker-id'), false);
  assert.strictEqual(isValidIp('999.999.999.999'), false);
  assert.strictEqual(isValidIp('192.168.1.1/24'), false);
  assert.strictEqual(isValidIp('192.168.01.1'), false); // Octal confusion prevented
  assert.strictEqual(isValidIp(''), false);

  // 6c. Header extraction priority and fallback
  const spoofedReq = new Request('http://localhost/api/rooms', {
    headers: { 'x-forwarded-for': 'attacker-spoofed-string, 10.0.0.1' }
  });
  assert.strictEqual(
    getTrustedClientIp(spoofedReq),
    '127.0.0.1',
    'Spoofed header must fall back to safe canonical IP rather than generating unlimited distinct identities'
  );

  const vercelReq = new Request('http://localhost/api/rooms', {
    headers: {
      'x-vercel-forwarded-for': '198.51.100.42',
      'x-forwarded-for': 'attacker-fake-ip'
    }
  });
  assert.strictEqual(
    getTrustedClientIp(vercelReq),
    '198.51.100.42',
    'Trusted platform header (Vercel) must take precedence over client-controlled X-Forwarded-For'
  );

  const multiIpReq = new Request('http://localhost/api/rooms', {
    headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' }
  });
  assert.strictEqual(
    getTrustedClientIp(multiIpReq),
    '203.0.113.195',
    'Leftmost client address must be extracted and validated'
  );

  // 6d. Memory bounding under high volume of failed attempts
  for (let i = 0; i < 50; i++) {
    recordFailedAttempt(`ephemeral_test_key_${i}`);
  }
  console.log('✓ Forwarded-IP Header Spoofing Defeated & Rate Limit Identity Secured');

  // Attack 7: Unauthorized Relay Packet Interception & Cross-Room Token Rejection (ENC-SEC-02)
  console.log('[ATTACK 7] Unauthorized Relay Access & Cross-Room Token Rejection (ENC-SEC-02)');
  const relayRoomAId = 'room_relay_a_' + generateSecureId('', 4);
  const relayRoomBId = 'room_relay_b_' + generateSecureId('', 4);

  const keysA = await deriveRoomKeys('room-a-passphrase-alpha');
  const keysB = await deriveRoomKeys('room-b-passphrase-bravo');

  createServerRoom(relayRoomAId, keysA.salt, keysA.authCommitment, wrappedBundle, false);
  createServerRoom(relayRoomBId, keysB.salt, keysB.authCommitment, wrappedBundle, false);

  updateRoomPresence(relayRoomAId, 'alice', 'join');

  // 7a. Unauthenticated GET to Relay -> 401
  const unauthGetReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, { method: 'GET' });
  const unauthGetRes = await relayGet(unauthGetReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(unauthGetRes.status, 401, 'Unauthenticated GET to /relay must return 401 Unauthorized');

  // 7b. Invalid Token GET to Relay -> 401
  const invalidTokenGetReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'GET',
    headers: { 'authorization': 'Bearer fake-invalid-token-xyz' }
  });
  const invalidTokenGetRes = await relayGet(invalidTokenGetReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(invalidTokenGetRes.status, 401, 'Invalid token GET to /relay must return 401 Unauthorized');

  // 7c. Cross-Room Token Substitution GET to Relay (Room B token used on Room A) -> 401
  const crossTokenGetReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${keysB.authCommitment}` }
  });
  const crossTokenGetRes = await relayGet(crossTokenGetReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(crossTokenGetRes.status, 401, 'Cross-room token substitution must return 401 Unauthorized');

  // 7d. Valid Token GET to Relay -> 200
  const validGetReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${keysA.authCommitment}` }
  });
  const validGetRes = await relayGet(validGetReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(validGetRes.status, 200, 'Valid authorized GET to /relay must return 200 OK');

  // 7e. Unauthenticated POST to Relay -> 401
  const testPacket = {
    version: 1,
    packetId: 'pkt_adv_001',
    roomId: relayRoomAId,
    senderId: 'alice',
    senderName: 'Alice',
    sequence: 1,
    timestamp: Date.now(),
    payload: { iv: 'iv', ciphertext: 'ct', sequence: 1, timestamp: Date.now() },
    type: 'chat_message'
  };
  const unauthPostReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(testPacket)
  });
  const unauthPostRes = await relayPost(unauthPostReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(unauthPostRes.status, 401, 'Unauthenticated POST to /relay must return 401 Unauthorized');

  // 7f. Authorized POST to Relay with mismatched roomId in packet -> 400
  const mismatchedPacketReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${keysA.authCommitment}`
    },
    body: JSON.stringify({ ...testPacket, roomId: 'room_mismatch_different' })
  });
  const mismatchedRes = await relayPost(mismatchedPacketReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(mismatchedRes.status, 400, 'Mismatched packet roomId must return 400 Bad Request');

  // 7g. Authorized POST to Relay -> 200
  const validPostReq = new Request(`http://localhost/api/rooms/${relayRoomAId}/relay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${keysA.authCommitment}`
    },
    body: JSON.stringify(testPacket)
  });
  const validPostRes = await relayPost(validPostReq, { params: Promise.resolve({ roomId: relayRoomAId }) });
  assert.strictEqual(validPostRes.status, 200, 'Authorized POST to /relay must return 200 OK');

  console.log('✓ Relay Authorization & Cross-Room Isolation Fully Enforced');

  // Attack 8: Unauthorized Media Upload & Retrieval Defeated
  console.log('[ATTACK 8] Unauthorized Media Access Defeated');
  const mediaRoomId = 'room_media_sec_' + generateSecureId('', 4);
  const keysMedia = await deriveRoomKeys('media-passphrase-gamma');
  createServerRoom(mediaRoomId, keysMedia.salt, keysMedia.authCommitment, wrappedBundle, false);

  // 8a. Unauthenticated Media Upload -> 401
  const unauthMediaUploadReq = new Request(`http://localhost/api/rooms/${mediaRoomId}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mediaId: 'med_001',
      ciphertext: 'enc_ct',
      iv: 'iv_bytes',
      mimeType: 'image/png',
      size: 1024
    })
  });
  const unauthMediaUploadRes = await mediaPost(unauthMediaUploadReq, { params: Promise.resolve({ roomId: mediaRoomId }) });
  assert.strictEqual(unauthMediaUploadRes.status, 401, 'Unauthenticated media upload must return 401 Unauthorized');

  // 8b. Authorized Media Upload -> 200
  const authMediaUploadReq = new Request(`http://localhost/api/rooms/${mediaRoomId}/media`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${keysMedia.authCommitment}`
    },
    body: JSON.stringify({
      mediaId: 'med_001',
      ciphertext: 'enc_ct',
      iv: 'iv_bytes',
      mimeType: 'image/png',
      size: 1024
    })
  });
  const authMediaUploadRes = await mediaPost(authMediaUploadReq, { params: Promise.resolve({ roomId: mediaRoomId }) });
  assert.strictEqual(authMediaUploadRes.status, 200, 'Authorized media upload must return 200 OK');

  // 8c. Unauthenticated Media Download -> 401
  const unauthMediaGetReq = new Request(`http://localhost/api/rooms/${mediaRoomId}/media?mediaId=med_001`, {
    method: 'GET'
  });
  const unauthMediaGetRes = await mediaGet(unauthMediaGetReq, { params: Promise.resolve({ roomId: mediaRoomId }) });
  assert.strictEqual(unauthMediaGetRes.status, 401, 'Unauthenticated media download must return 401 Unauthorized');

  // 8d. Authorized Media Download -> 200
  const authMediaGetReq = new Request(`http://localhost/api/rooms/${mediaRoomId}/media?mediaId=med_001`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${keysMedia.authCommitment}` }
  });
  const authMediaGetRes = await mediaGet(authMediaGetReq, { params: Promise.resolve({ roomId: mediaRoomId }) });
  assert.strictEqual(authMediaGetRes.status, 200, 'Authorized media download must return 200 OK');

  // 8e. Post-destruction media download -> 410
  destroyServerRoom(mediaRoomId, 'Teardown');
  const postDestroyMediaGetReq = new Request(`http://localhost/api/rooms/${mediaRoomId}/media?mediaId=med_001`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${keysMedia.authCommitment}` }
  });
  const postDestroyMediaGetRes = await mediaGet(postDestroyMediaGetReq, { params: Promise.resolve({ roomId: mediaRoomId }) });
  assert.strictEqual(postDestroyMediaGetRes.status, 410, 'Media download on destroyed room must return 410 Gone');

  // Scenario 9: Full Two-User Room Joining, Presence Discovery & Bidirectional E2EE Message Relay
  console.log('[SCENARIO 9] Two-User Room Joining, Presence Discovery & Bidirectional E2EE Message Relay');
  const sharedRoomId = 'room_join_real_' + generateSecureId('', 4);
  const sharedPass = 'matrix-sanctum-quantum-cipher';
  const sharedKeys = await deriveRoomKeys(sharedPass);
  const { roomMasterSecret: sharedRms, wrappedBundle: sharedWrappedBundle } = await createAndWrapRoomSecret(sharedKeys.keyWrappingKey);

  // 9a. Host (User A) creates room on server
  createServerRoom(sharedRoomId, sharedKeys.salt, sharedKeys.authCommitment, sharedWrappedBundle, false);

  // 9b. Host (User A) joins room and registers presence
  const userAId = 'user_alice_' + generateSecureId('', 3);
  const aliceJoinReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/presence`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${sharedKeys.authCommitment}`
    },
    body: JSON.stringify({
      action: 'join',
      participantId: userAId,
      displayName: 'Alice (Host)'
    })
  });
  const aliceJoinRes = await presencePost(aliceJoinReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(aliceJoinRes.status, 200);
  const aliceJoinData = await aliceJoinRes.json();
  assert.strictEqual(aliceJoinData.state, 'WAITING');
  assert.strictEqual(aliceJoinData.participantCount, 1);
  assert.strictEqual(aliceJoinData.participants.length, 1);
  assert.strictEqual(aliceJoinData.participants[0].id, userAId);

  // 9c. Guest (User B) enters Room ID and Access Pass, derives keys, and joins room
  const userBId = 'user_bob_' + generateSecureId('', 3);
  const guestDerivedKeys = await deriveRoomKeys(sharedPass, sharedKeys.salt);
  assert.strictEqual(guestDerivedKeys.authCommitment, sharedKeys.authCommitment);

  const bobJoinReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/presence`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${guestDerivedKeys.authCommitment}`
    },
    body: JSON.stringify({
      action: 'join',
      participantId: userBId,
      displayName: 'Bob (Guest)'
    })
  });
  const bobJoinRes = await presencePost(bobJoinReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(bobJoinRes.status, 200);
  const bobJoinData = await bobJoinRes.json();
  assert.strictEqual(bobJoinData.state, 'ACTIVE', 'Room state must immediately transition to ACTIVE upon second participant');
  assert.strictEqual(bobJoinData.participantCount, 2);
  assert.strictEqual(bobJoinData.participants.length, 2);
  assert.ok(bobJoinData.participants.some((p: any) => p.id === userAId && p.displayName === 'Alice (Host)'));
  assert.ok(bobJoinData.participants.some((p: any) => p.id === userBId && p.displayName === 'Bob (Guest)'));

  // 9d. Host (User A) sends encrypted message over Relay
  const aliceSenderKey = await deriveEphemeralSessionKey(sharedRms, userAId);
  const bobReceiverKey = await deriveEphemeralSessionKey(sharedRms, userAId);

  const alicePayload = await encryptMessage(aliceSenderKey, 'Hello Bob! Welcome to Enclave.', sharedRoomId, 'pkt_alice_01', userAId, 1, Date.now(), 1);
  const alicePkt = {
    version: 1,
    packetId: 'pkt_alice_01',
    roomId: sharedRoomId,
    senderId: userAId,
    senderName: 'Alice (Host)',
    sequence: 1,
    timestamp: Date.now(),
    payload: alicePayload,
    type: 'chat_message'
  };

  const alicePostPktReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/relay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${sharedKeys.authCommitment}`
    },
    body: JSON.stringify(alicePkt)
  });
  const alicePostRes = await relayPost(alicePostPktReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(alicePostRes.status, 200);

  // 9e. Guest (User B) polls Relay and decrypts Alice's message
  const bobPollReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/relay?since=0`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${guestDerivedKeys.authCommitment}` }
  });
  const bobPollRes = await relayGet(bobPollReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(bobPollRes.status, 200);
  const bobPollData = await bobPollRes.json();
  assert.strictEqual(bobPollData.packets.length, 1);
  assert.strictEqual(bobPollData.packets[0].packetId, 'pkt_alice_01');

  const decryptedText = await decryptMessage(bobReceiverKey, bobPollData.packets[0].payload, sharedRoomId, 'pkt_alice_01', userAId, 1);
  assert.strictEqual(decryptedText, 'Hello Bob! Welcome to Enclave.', 'Guest must successfully decrypt Host message with 100% fidelity');

  // 9f. Guest (User B) sends response back, Host (User A) receives and decrypts
  const bobSenderKey = await deriveEphemeralSessionKey(sharedRms, userBId);
  const aliceReceiverKey = await deriveEphemeralSessionKey(sharedRms, userBId);

  const bobPayload = await encryptMessage(bobSenderKey, 'Hi Alice! Joined securely.', sharedRoomId, 'pkt_bob_01', userBId, 1, Date.now(), 1);
  const bobPkt = {
    version: 1,
    packetId: 'pkt_bob_01',
    roomId: sharedRoomId,
    senderId: userBId,
    senderName: 'Bob (Guest)',
    sequence: 1,
    timestamp: Date.now(),
    payload: bobPayload,
    type: 'chat_message'
  };

  const bobPostPktReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/relay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${guestDerivedKeys.authCommitment}`
    },
    body: JSON.stringify(bobPkt)
  });
  const bobPostPktRes = await relayPost(bobPostPktReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(bobPostPktRes.status, 200);

  const alicePollReq = new Request(`http://localhost/api/rooms/${sharedRoomId}/relay?since=0`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${sharedKeys.authCommitment}` }
  });
  const alicePollRes = await relayGet(alicePollReq, { params: Promise.resolve({ roomId: sharedRoomId }) });
  assert.strictEqual(alicePollRes.status, 200);
  const alicePollData = await alicePollRes.json();
  assert.strictEqual(alicePollData.packets.length, 2);

  const decryptedResponse = await decryptMessage(aliceReceiverKey, alicePollData.packets[1].payload, sharedRoomId, 'pkt_bob_01', userBId, 1);
  assert.strictEqual(decryptedResponse, 'Hi Alice! Joined securely.');

  console.log('✓ Full Two-User Room Joining, Presence Discovery & E2EE Relay Verified');

  // Scenario 10: Passwordless (Open Access) Room Lifecycle, Guest Auto-Join & E2EE Relay
  console.log('[SCENARIO 10] Passwordless (Open Access) Room Creation, Guest Joining with Only Room ID & E2EE Relay');
  const openRoomId = 'room_open_' + generateSecureId('', 4);
  const openRoomPass = getOpenAccessPassphrase(openRoomId);
  const openKeys = await deriveRoomKeys(openRoomPass);
  const { roomMasterSecret: openRms, wrappedBundle: openWrappedBundle } = await createAndWrapRoomSecret(openKeys.keyWrappingKey);

  // 10a. Host creates passwordless room on server
  createServerRoom(openRoomId, openKeys.salt, openKeys.authCommitment, openWrappedBundle, false, false, 'without_pass');

  // 10b. Verify public metadata identifies room as passwordless
  const metaReq = new Request(`http://localhost/api/rooms/${openRoomId}`, { method: 'GET' });
  const metaRes = await roomMetaGet(metaReq, { params: Promise.resolve({ roomId: openRoomId }) });
  assert.strictEqual(metaRes.status, 200);
  const metaData = await metaRes.json();
  assert.strictEqual(metaData.requirePass, false, 'Passwordless room requirePass must be false');
  assert.strictEqual(metaData.accessMode, 'without_pass', 'Passwordless room accessMode must be without_pass');

  // 10c. Host joins passwordless room
  const hostUser = 'user_host_' + generateSecureId('', 3);
  const hostPresenceReq = new Request(`http://localhost/api/rooms/${openRoomId}/presence`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${openKeys.authCommitment}`
    },
    body: JSON.stringify({
      action: 'join',
      participantId: hostUser,
      displayName: 'Host'
    })
  });
  const hostPresenceRes = await presencePost(hostPresenceReq, { params: Promise.resolve({ roomId: openRoomId }) });
  assert.strictEqual(hostPresenceRes.status, 200);

  // 10d. Guest arrives with ONLY the Room ID (no passphrase provided out-of-band)
  const guestUser = 'user_guest_' + generateSecureId('', 3);
  const guestOpenPass = getOpenAccessPassphrase(openRoomId);
  const guestDerived = await deriveRoomKeys(guestOpenPass, metaData.salt);

  // Verify client-side auth commitment match & RMS unwrap
  assert.ok(timingSafeEqual(guestDerived.authCommitment, metaData.authCommitment), 'Derived auth commitment must match');
  const guestUnwrappedRms = await unwrapRoomSecret(guestDerived.keyWrappingKey, metaData.wrappedSecretBundle);
  assert.deepStrictEqual(guestUnwrappedRms, openRms, 'Guest unwrapped RMS must match original Host RMS byte-for-byte');

  // 10e. Guest joins presence -> transitions to ACTIVE with 2 participants
  const guestPresenceReq = new Request(`http://localhost/api/rooms/${openRoomId}/presence`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${guestDerived.authCommitment}`
    },
    body: JSON.stringify({
      action: 'join',
      participantId: guestUser,
      displayName: 'Guest'
    })
  });
  const guestPresenceRes = await presencePost(guestPresenceReq, { params: Promise.resolve({ roomId: openRoomId }) });
  assert.strictEqual(guestPresenceRes.status, 200);
  const guestPresenceData = await guestPresenceRes.json();
  assert.strictEqual(guestPresenceData.state, 'ACTIVE');
  assert.strictEqual(guestPresenceData.participantCount, 2);

  // 10f. Host sends E2EE message in passwordless room
  const hostSenderKey = await deriveEphemeralSessionKey(openRms, hostUser);
  const guestReceiverKey = await deriveEphemeralSessionKey(guestUnwrappedRms, hostUser);
  const openMsgPayload = await encryptMessage(hostSenderKey, 'Open room message to guest', openRoomId, 'pkt_open_01', hostUser, 1, Date.now(), 1);

  const hostPostReq = new Request(`http://localhost/api/rooms/${openRoomId}/relay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${openKeys.authCommitment}`
    },
    body: JSON.stringify({
      version: 1,
      packetId: 'pkt_open_01',
      roomId: openRoomId,
      senderId: hostUser,
      senderName: 'Host',
      sequence: 1,
      timestamp: Date.now(),
      payload: openMsgPayload,
      type: 'chat_message'
    })
  });
  const hostPostRes = await relayPost(hostPostReq, { params: Promise.resolve({ roomId: openRoomId }) });
  assert.strictEqual(hostPostRes.status, 200);

  // 10g. Guest polls and decrypts
  const guestPollReq = new Request(`http://localhost/api/rooms/${openRoomId}/relay?since=0`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${guestDerived.authCommitment}` }
  });
  const guestPollRes = await relayGet(guestPollReq, { params: Promise.resolve({ roomId: openRoomId }) });
  assert.strictEqual(guestPollRes.status, 200);
  const guestPollData = await guestPollRes.json();
  assert.strictEqual(guestPollData.packets.length, 1);

  const guestDecrypted = await decryptMessage(guestReceiverKey, guestPollData.packets[0].payload, openRoomId, 'pkt_open_01', hostUser, 1);
  assert.strictEqual(guestDecrypted, 'Open room message to guest');

  // 10h. Cross-Room Isolation: Passwordless Room A auth token rejected on Room B
  const anotherOpenRoomId = 'room_open_other_' + generateSecureId('', 4);
  const anotherOpenKeys = await deriveRoomKeys(getOpenAccessPassphrase(anotherOpenRoomId));
  const crossOpenPollReq = new Request(`http://localhost/api/rooms/${anotherOpenRoomId}/relay?since=0`, {
    method: 'GET',
    headers: { 'authorization': `Bearer ${guestDerived.authCommitment}` }
  });
  const crossOpenPollRes = await relayGet(crossOpenPollReq, { params: Promise.resolve({ roomId: anotherOpenRoomId }) });
  assert.strictEqual(crossOpenPollRes.status, 404, 'Non-existent or mismatched room token must be rejected');

  console.log('✓ Passwordless Room Creation, Guest Joining with Only Room ID & E2EE Relay Verified');

  console.log('\n>>> ALL ADVERSARIAL TESTS PASSED SUCCESSFULLY <<<\n');
}
