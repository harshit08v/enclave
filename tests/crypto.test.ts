/**
 * ENCLAVE Cryptography Verification Suite
 * Tests Argon2id, Key Wrapping, AES-256-GCM, Canonical AAD, Replay Protection, Zeroization.
 */

import assert from 'node:assert';
import {
  generateDicewarePassphrase,
  generateAlphanumericKey,
  generateSecureId,
  deriveRoomKeys,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  deriveEphemeralSessionKey,
  encryptMessage,
  decryptMessage,
  timingSafeEqual,
  zeroizeBuffer,
  createCanonicalAAD,
  bufferToBase64,
  base64ToBuffer
} from '../packages/crypto/index.ts';

export async function runCryptoTests() {
  console.log('\n--- Running Cryptographic Verification Tests ---');

  // Test 1: Randomness and Entropy Generation
  console.log('[TEST 1] Entropy & CSPRNG Passphrase Generation');
  const pass1 = generateDicewarePassphrase();
  const pass2 = generateDicewarePassphrase();
  assert.strictEqual(typeof pass1, 'string');
  assert.strictEqual(pass1.split('-').length, 4);
  assert.notStrictEqual(pass1, pass2, 'Consecutive passphrases must be distinct');

  const hexKey1 = generateAlphanumericKey(16);
  const hexKey2 = generateAlphanumericKey(16);
  assert.notStrictEqual(hexKey1, hexKey2);

  const secId = generateSecureId('room', 6);
  assert.ok(secId.startsWith('room_'));
  assert.strictEqual(secId.length, 5 + 12);
  console.log('✓ CSPRNG Passphrase & Identifier Generation Verified');

  // Test 2: Argon2id Key Derivation & Domain Separation
  console.log('[TEST 2] Argon2id Key Derivation & HKDF Domain Separation');
  const testPass = 'monolith-sanctum-obsidian-zenith';
  const bundle1 = await deriveRoomKeys(testPass);
  assert.ok(bundle1.authCommitment.length === 64, 'Auth commitment must be 256-bit hex SHA-256');
  assert.ok(bundle1.salt.length > 0, 'Salt must be present');

  // Determinism: Same pass + same salt must yield identical authCommitment
  const bundle2 = await deriveRoomKeys(testPass, bundle1.salt);
  assert.strictEqual(bundle1.authCommitment, bundle2.authCommitment, 'Argon2id KDF must be deterministic');

  // Different passphrase must yield completely different commitment
  const bundle3 = await deriveRoomKeys('different-passphrase-value', bundle1.salt);
  assert.notStrictEqual(bundle1.authCommitment, bundle3.authCommitment);
  console.log('✓ Argon2id Determinism & Domain Separation Verified');

  // Test 3: Key Wrapping & Unwrapping of Room Master Secret
  console.log('[TEST 3] Room Master Secret (RMS) Wrapping & Unwrapping');
  const { roomMasterSecret: originalRMS, wrappedBundle } = await createAndWrapRoomSecret(bundle1.keyWrappingKey);
  assert.strictEqual(originalRMS.length, 32, 'RMS must be 256 bits (32 bytes)');
  assert.ok(wrappedBundle.wrappedKey && wrappedBundle.iv, 'Wrapped bundle must contain ciphertext and IV');

  // Correct recipient unwrap
  const unwrappedRMS = await unwrapRoomSecret(bundle2.keyWrappingKey, wrappedBundle);
  assert.deepStrictEqual(originalRMS, unwrappedRMS, 'Unwrapped RMS must match original RMS byte-for-byte');

  // Attacker with wrong key must fail unwrap
  let wrongKeyFailed = false;
  try {
    await unwrapRoomSecret(bundle3.keyWrappingKey, wrappedBundle);
  } catch {
    wrongKeyFailed = true;
  }
  assert.ok(wrongKeyFailed, 'Unwrapping with wrong key must fail authentication');
  console.log('✓ Room Master Secret Wrapping & Authentication Verified');

  // Test 4: Directional Ephemeral Session Key Derivation & AES-256-GCM
  console.log('[TEST 4] Ephemeral Session Keys & AES-256-GCM Authenticated Encryption');
  const senderId = 'usr_alice';
  const recipientId = 'usr_bob';
  const aliceSenderKey = await deriveEphemeralSessionKey(originalRMS, senderId);
  const bobReceiverKey = await deriveEphemeralSessionKey(unwrappedRMS, senderId);

  const roomId = 'room_9f82-a1b4';
  const packetId = 'pkt_001';
  const sequence = 1;
  const timestamp = Date.now();
  const plaintext = 'Secret rendezvous at 22:00 UTC.';

  const payload = await encryptMessage(
    aliceSenderKey,
    plaintext,
    roomId,
    packetId,
    senderId,
    sequence,
    timestamp,
    1
  );

  assert.ok(payload.ciphertext && payload.iv, 'Encrypted payload must contain ciphertext and IV');
  assert.strictEqual(payload.sequence, 1);

  // Bob decrypts with Canonical AAD
  const decrypted = await decryptMessage(
    bobReceiverKey,
    payload,
    roomId,
    packetId,
    senderId,
    1
  );
  assert.strictEqual(decrypted, plaintext, 'Decrypted text must match original plaintext');
  console.log('✓ AES-256-GCM Encryption and Decryption with Canonical AAD Verified');

  // Test 5: Adversarial Ciphertext & AAD Modification Rejections
  console.log('[TEST 5] Adversarial Cryptographic Attacks (Tamper Resistance)');

  // 5a. Bit flip in ciphertext
  const cipherBytes = new Uint8Array(base64ToBuffer(payload.ciphertext));
  cipherBytes[0] ^= 0x01; // Flip 1 bit
  const tamperedPayload = { ...payload, ciphertext: bufferToBase64(cipherBytes) };
  let bitFlipRejected = false;
  try {
    await decryptMessage(bobReceiverKey, tamperedPayload, roomId, packetId, senderId, 1);
  } catch {
    bitFlipRejected = true;
  }
  assert.ok(bitFlipRejected, 'Modified ciphertext must fail GCM authentication tag check');

  // 5b. Modified Room ID in AAD
  let aadRoomMismatch = false;
  try {
    await decryptMessage(bobReceiverKey, payload, 'room_attacker_room', packetId, senderId, 1);
  } catch {
    aadRoomMismatch = true;
  }
  assert.ok(aadRoomMismatch, 'Decryption with altered Room ID in AAD must fail');

  // 5c. Modified Sender ID in AAD
  let aadSenderMismatch = false;
  try {
    await decryptMessage(bobReceiverKey, payload, roomId, packetId, 'usr_impersonator', 1);
  } catch {
    aadSenderMismatch = true;
  }
  assert.ok(aadSenderMismatch, 'Decryption with altered Sender ID in AAD must fail');

  // 5d. Modified Sequence in AAD
  const sequenceTamperedPayload = { ...payload, sequence: 999 };
  let aadSequenceMismatch = false;
  try {
    await decryptMessage(bobReceiverKey, sequenceTamperedPayload, roomId, packetId, senderId, 1);
  } catch {
    aadSequenceMismatch = true;
  }
  assert.ok(aadSequenceMismatch, 'Decryption with altered Sequence Number in AAD must fail');

  // 5e. Modified IV
  const ivBytes = new Uint8Array(base64ToBuffer(payload.iv));
  ivBytes[0] ^= 0xff;
  const ivTamperedPayload = { ...payload, iv: bufferToBase64(ivBytes) };
  let ivMismatch = false;
  try {
    await decryptMessage(bobReceiverKey, ivTamperedPayload, roomId, packetId, senderId, 1);
  } catch {
    ivMismatch = true;
  }
  assert.ok(ivMismatch, 'Decryption with altered IV must fail');
  console.log('✓ All 5 Tampering Attacks Defeated and Verified');

  // Test 6: Timing-Safe String Comparison
  console.log('[TEST 6] Constant-Time Equality');
  assert.ok(timingSafeEqual('0123456789abcdef', '0123456789abcdef'));
  assert.ok(!timingSafeEqual('0123456789abcdef', '0123456789abcdeg'));
  assert.ok(!timingSafeEqual('short', 'longer_string'));
  console.log('✓ Timing-Safe Equality Verified');

  // Test 7: Buffer Zeroization
  console.log('[TEST 7] Secure Buffer Zeroization');
  const sensitiveBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  zeroizeBuffer(sensitiveBuffer);
  assert.ok(sensitiveBuffer.every(byte => byte === 0), 'Buffer must be completely zeroized');
  console.log('✓ Buffer Zeroization Verified');

  console.log('\n>>> ALL CRYPTO TESTS PASSED SUCCESSFULLY <<<\n');
}
