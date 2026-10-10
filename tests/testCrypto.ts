import {
  deriveRoomKeys,
  getOpenAccessPassphrase,
  timingSafeEqual,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  deriveEphemeralSessionKey,
  encryptMessage,
  decryptMessage,
  derivePassKeyArgon2id
} from '../packages/crypto/index.ts';
import assert from 'node:assert';

async function main() {
  console.log('Testing Argon2id directly...');
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  
  const t0 = Date.now();
  const pdk = await derivePassKeyArgon2id('test-passphrase-123', salt);
  console.log(`Argon2id derived ${pdk.length} bytes in ${Date.now() - t0}ms`);
  assert.strictEqual(pdk.length, 32);

  console.log('Testing deriveRoomKeys...');
  const keys = await deriveRoomKeys('test-passphrase-123');
  console.log('Auth commitment:', keys.authCommitment);
  console.log('Salt:', keys.salt);
  assert.ok(keys.authCommitment);
  assert.ok(keys.keyWrappingKey);

  console.log('Testing RMS wrap/unwrap...');
  const { roomMasterSecret, wrappedBundle } = await createAndWrapRoomSecret(keys.keyWrappingKey);
  const unwrapped = await unwrapRoomSecret(keys.keyWrappingKey, wrappedBundle);
  assert.deepStrictEqual(Array.from(roomMasterSecret), Array.from(unwrapped));

  console.log('Testing deterministic guest derivation...');
  const guestKeys = await deriveRoomKeys('test-passphrase-123', keys.salt);
  assert.ok(timingSafeEqual(keys.authCommitment, guestKeys.authCommitment));
  const guestUnwrapped = await unwrapRoomSecret(guestKeys.keyWrappingKey, wrappedBundle);
  assert.deepStrictEqual(Array.from(roomMasterSecret), Array.from(guestUnwrapped));

  console.log('Testing Open Access deterministic derivation...');
  const openPass = getOpenAccessPassphrase('8f92-c0e4');
  const openKeysHost = await deriveRoomKeys(openPass);
  const { roomMasterSecret: openRms, wrappedBundle: openWrapped } = await createAndWrapRoomSecret(openKeysHost.keyWrappingKey);

  const openKeysGuest = await deriveRoomKeys(getOpenAccessPassphrase('8F92-C0E4'), openKeysHost.salt);
  assert.ok(timingSafeEqual(openKeysHost.authCommitment, openKeysGuest.authCommitment));
  const guestOpenUnwrapped = await unwrapRoomSecret(openKeysGuest.keyWrappingKey, openWrapped);
  assert.deepStrictEqual(Array.from(openRms), Array.from(guestOpenUnwrapped));

  console.log('ALL CRYPTO TESTS PASSED!');
}

main().catch(err => {
  console.error('CRYPTO TEST FAILED:', err);
  process.exit(1);
});
