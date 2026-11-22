import assert from 'assert';
import { WebDoubleRatchetSession } from '../packages/crypto/webDoubleRatchet';
import { generateFreshDeviceIdentity } from '../src/lib/deviceIdentity';

async function main() {
  console.log('Testing WebDoubleRatchetSession...');
  const devA = await generateFreshDeviceIdentity();
  const devB = await generateFreshDeviceIdentity();
  const rms = new Uint8Array(32).fill(7);

  const subtle = globalThis.crypto.subtle;
  const rmsKey = await subtle.importKey('raw', rms, 'HKDF', false, ['deriveBits']);
  const rootBits = await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('pairwise-root') },
    rmsKey,
    256
  );
  const pairwiseRoot = new Uint8Array(rootBits);

  const alice = await WebDoubleRatchetSession.create(
    devA.identityPublicKeyHex,
    devA.identityPrivateKeyPkcs8Hex,
    pairwiseRoot,
    true,
    devB.prekeyPublicKeyHex,
    devB.identityPublicKeyHex
  );

  const bob = await WebDoubleRatchetSession.create(
    devB.identityPublicKeyHex,
    devB.identityPrivateKeyPkcs8Hex,
    pairwiseRoot,
    false,
    devA.prekeyPublicKeyHex,
    devA.identityPublicKeyHex,
    devB.prekeyPrivateKeyPkcs8Hex,
    devB.prekeyPublicKeyHex
  );

  // 1. Alice -> Bob
  const enc1 = await alice.ratchetEncrypt('Secret message from Alice');
  console.log('Alice encrypted msg 1, sequence n:', enc1.ratchetHeader.n, 'dhPub:', enc1.ratchetHeader.dhPub.slice(0, 16));
  const dec1 = await bob.ratchetDecrypt(enc1.ciphertext, enc1.iv, enc1.ratchetHeader, enc1.signature);
  console.log('Bob decrypted msg 1:', dec1);
  assert.strictEqual(dec1, 'Secret message from Alice');

  // 2. Bob -> Alice
  const enc2 = await bob.ratchetEncrypt('Secret reply from Bob');
  console.log('Bob encrypted reply, sequence n:', enc2.ratchetHeader.n, 'dhPub:', enc2.ratchetHeader.dhPub.slice(0, 16));
  const dec2 = await alice.ratchetDecrypt(enc2.ciphertext, enc2.iv, enc2.ratchetHeader, enc2.signature);
  console.log('Alice decrypted reply:', dec2);
  assert.strictEqual(dec2, 'Secret reply from Bob');

  // 3. Alice -> Bob second message (advances sending chain)
  const enc3 = await alice.ratchetEncrypt('Alice message #2 in same chain');
  console.log('Alice encrypted msg 3, sequence n:', enc3.ratchetHeader.n);
  const dec3 = await bob.ratchetDecrypt(enc3.ciphertext, enc3.iv, enc3.ratchetHeader, enc3.signature);
  console.log('Bob decrypted msg 3:', dec3);
  assert.strictEqual(dec3, 'Alice message #2 in same chain');

  // 4. Bob -> Alice multiple consecutive messages (advances Bob's sending chain)
  const enc4a = await bob.ratchetEncrypt('Bob response #2');
  const enc4b = await bob.ratchetEncrypt('Bob response #3');
  const dec4a = await alice.ratchetDecrypt(enc4a.ciphertext, enc4a.iv, enc4a.ratchetHeader, enc4a.signature);
  const dec4b = await alice.ratchetDecrypt(enc4b.ciphertext, enc4b.iv, enc4b.ratchetHeader, enc4b.signature);
  assert.strictEqual(dec4a, 'Bob response #2');
  assert.strictEqual(dec4b, 'Bob response #3');
  console.log('Bob multiple consecutive messages decrypted by Alice successfully');

  // 5. Out of order delivery test: Alice sends 3 messages, Bob receives in reverse order
  const m1 = await alice.ratchetEncrypt('Out-of-order #1');
  const m2 = await alice.ratchetEncrypt('Out-of-order #2');
  const m3 = await alice.ratchetEncrypt('Out-of-order #3');

  const d3 = await bob.ratchetDecrypt(m3.ciphertext, m3.iv, m3.ratchetHeader, m3.signature);
  const d1 = await bob.ratchetDecrypt(m1.ciphertext, m1.iv, m1.ratchetHeader, m1.signature);
  const d2 = await bob.ratchetDecrypt(m2.ciphertext, m2.iv, m2.ratchetHeader, m2.signature);
  assert.strictEqual(d1, 'Out-of-order #1');
  assert.strictEqual(d2, 'Out-of-order #2');
  assert.strictEqual(d3, 'Out-of-order #3');
  console.log('Out-of-order delivery with skipped keys verified');

  // 6. Anti-Replay: duplicate sequence rejected
  let duplicateRejected = false;
  try {
    await bob.ratchetDecrypt(m3.ciphertext, m3.iv, m3.ratchetHeader, m3.signature);
  } catch (err: any) {
    duplicateRejected = err.message.includes('REPLAY') || err.message.includes('already consumed');
  }
  assert.strictEqual(duplicateRejected, true, 'Replay of consumed message sequence must be rejected');
  console.log('Anti-replay sequence check verified');

  console.log('ALL WEBDOUBLERATCHET TESTS PASSED CLEANLY!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
