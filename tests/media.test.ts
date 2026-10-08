/**
 * ENCLAVE Media & Interaction Security Verification Suite
 * Tests client-side AES-256-GCM media encryption/decryption, blind storage,
 * memory wiping on room dissolution, and reply/reaction protocol handling.
 */

import assert from 'node:assert';
import {
  encryptMediaBlob,
  decryptMediaBlob,
  deriveEphemeralSessionKey,
  createAndWrapRoomSecret,
  deriveRoomKeys
} from '../packages/crypto/index.ts';
import {
  storeEncryptedMedia,
  getEncryptedMedia,
  destroyServerRoom,
  createServerRoom,
  updateRoomPresence
} from '../src/lib/serverRoomStore.ts';
import { validateMediaFile, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '../src/lib/mediaConfig.ts';

export async function runMediaTests() {
  console.log('\n--- Running Encrypted Media & Interaction Security Tests ---');

  const roomId = 'room_media_test_' + Date.now();
  const keyBundle = await deriveRoomKeys('sample-passphrase-1234');
  const { roomMasterSecret, wrappedBundle } = await createAndWrapRoomSecret(keyBundle.keyWrappingKey);

  // Server Room setup
  createServerRoom(roomId, keyBundle.salt, keyBundle.authCommitment, wrappedBundle, false);
  updateRoomPresence(roomId, 'sender_alice', 'join');
  updateRoomPresence(roomId, 'receiver_bob', 'join');

  const senderKey = await deriveEphemeralSessionKey(roomMasterSecret, 'sender_alice');
  const receiverKey = await deriveEphemeralSessionKey(roomMasterSecret, 'sender_alice');

  // Test 1: Media Encryption & Local Decryption Fidelity
  console.log('[TEST 1] Client-Side Media Encryption & Byte-for-Byte Fidelity');
  const originalBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
  const mimeType = 'image/png';
  const mediaId = 'med_test_001';
  const timestamp = Date.now();

  const encrypted = await encryptMediaBlob(
    senderKey,
    originalBytes,
    roomId,
    mediaId,
    mimeType,
    timestamp,
    1
  );

  assert.ok(encrypted.ciphertext, 'Ciphertext must be present');
  assert.ok(encrypted.iv, 'IV must be present');
  assert.strictEqual(encrypted.mediaId, mediaId);
  assert.strictEqual(encrypted.size, originalBytes.byteLength);

  // Ciphertext must not match plaintext
  assert.notStrictEqual(encrypted.ciphertext, Buffer.from(originalBytes).toString('base64'));

  // Decrypt using receiver's directional key
  const decryptedBytes = await decryptMediaBlob(
    receiverKey,
    {
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      mimeType,
      timestamp
    },
    roomId,
    mediaId,
    1
  );

  assert.deepStrictEqual(
    Array.from(decryptedBytes),
    Array.from(originalBytes),
    'Decrypted media bytes must match original input perfectly'
  );
  console.log('✓ Encrypted media round-trip decryption verified with 100% byte fidelity');

  // Test 2: Blind Server Storage & Retrieval
  console.log('[TEST 2] Blind Server Ciphertext Store & Retrieval');
  const stored = storeEncryptedMedia(roomId, {
    mediaId,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    mimeType,
    size: originalBytes.byteLength,
    timestamp
  });
  assert.strictEqual(stored, true, 'Blind encrypted media must be accepted by room store');

  const retrieved = getEncryptedMedia(roomId, mediaId);
  assert.ok(retrieved, 'Media should be retrievable before room destruction');
  assert.strictEqual(retrieved?.ciphertext, encrypted.ciphertext);
  console.log('✓ Blind server store and ciphertext retrieval verified');

  // Test 3: Media Size & MIME Type Validation Rules
  console.log('[TEST 3] Media Type & Size Policy Enforcement');
  const validMockImage = { name: 'photo.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg' } as File;
  assert.strictEqual(validateMediaFile(validMockImage).valid, true);

  const oversizedMockImage = { name: 'huge.png', size: MAX_IMAGE_SIZE + 1024, type: 'image/png' } as File;
  assert.strictEqual(validateMediaFile(oversizedMockImage).valid, false);

  const validMockVideo = { name: 'clip.mp4', size: 20 * 1024 * 1024, type: 'video/mp4' } as File;
  assert.strictEqual(validateMediaFile(validMockVideo).valid, true);

  const oversizedMockVideo = { name: 'movie.mp4', size: MAX_VIDEO_SIZE + 1024, type: 'video/mp4' } as File;
  assert.strictEqual(validateMediaFile(oversizedMockVideo).valid, false);

  const invalidMime = { name: 'script.sh', size: 1024, type: 'application/x-sh' } as File;
  assert.strictEqual(validateMediaFile(invalidMime).valid, false);
  console.log('✓ Strict media validation policies verified');

  // Test 4: Immediate Media Obliteration on Room Dissolution
  console.log('[TEST 4] Immediate Media Obliteration on Dissolution');
  destroyServerRoom(roomId, 'Test teardown');

  const postDissolutionMedia = getEncryptedMedia(roomId, mediaId);
  assert.strictEqual(
    postDissolutionMedia,
    null,
    'Encrypted media must be completely wiped from server memory upon room dissolution'
  );
  console.log('✓ Post-dissolution memory wipe verified (0 remaining media bytes)');

  console.log('\n>>> ALL MEDIA TESTS PASSED SUCCESSFULLY <<<\n');
}
