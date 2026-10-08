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
  resetRateLimit
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
  sanitizeRoomUrl
} from '../packages/crypto/index.ts';

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

  console.log('\n>>> ALL ADVERSARIAL TESTS PASSED SUCCESSFULLY <<<\n');
}
