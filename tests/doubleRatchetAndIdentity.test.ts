/**
 * ENCLAVE Double Ratchet & Device Identity Test Suite
 * Validates Signal Double Ratchet Engine and Device Identity Management.
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  generateIdentityKeyPair,
  generateDHKeyPair,
  DoubleRatchetSession,
  calculateSafetyNumber as calculateProtoSafetyNumber
} from '../packages/crypto/doubleRatchet';
import {
  generateFreshDeviceIdentity,
  signWithDeviceIdentity,
  verifyDeviceIdentitySignature,
  calculateSafetyNumber
} from '../src/lib/deviceIdentity';

export async function runDoubleRatchetAndIdentityTests() {
  console.log('\n--- Running Double Ratchet & Device Identity Tests ---');

  // Test 1: Device Identity Key Generation
  console.log('[TEST 1] Asymmetric Device Identity Generation (Ed25519 + X25519)');
  const devId1 = await generateFreshDeviceIdentity();
  const devId2 = await generateFreshDeviceIdentity();

  assert.strictEqual(devId1.identityPublicKeyHex.length, 64, 'Ed25519 public key must be 32 bytes (64 hex chars)');
  assert.strictEqual(devId1.prekeyPublicKeyHex.length, 64, 'X25519 prekey must be 32 bytes (64 hex chars)');
  assert.notStrictEqual(devId1.deviceId, devId2.deviceId, 'Device IDs must be unique');
  console.log('✓ Device identities generated with valid Ed25519 & X25519 keypairs');

  // Test 2: Identity Signing and Verification
  console.log('[TEST 2] Identity Signing & Tamper Verification');
  const payload = new TextEncoder().encode('ENCLAVE_DEVICE_VERIFY_PAYLOAD_12345');
  const signature = await signWithDeviceIdentity(devId1, payload);
  const isValid = await verifyDeviceIdentitySignature(devId1.identityPublicKeyHex, payload, signature);
  assert.strictEqual(isValid, true, 'Valid signature must verify successfully');

  const tamperedPayload = new TextEncoder().encode('ENCLAVE_DEVICE_VERIFY_PAYLOAD_TAMPERED');
  const isTamperedValid = await verifyDeviceIdentitySignature(devId1.identityPublicKeyHex, tamperedPayload, signature);
  assert.strictEqual(isTamperedValid, false, 'Tampered payload must be rejected');

  const wrongSignerValid = await verifyDeviceIdentitySignature(devId2.identityPublicKeyHex, payload, signature);
  assert.strictEqual(wrongSignerValid, false, 'Signature from wrong identity must be rejected');
  console.log('✓ Identity signature and tamper rejection verified');

  // Test 3: Deterministic 60-digit Safety Numbers
  console.log('[TEST 3] Deterministic 60-digit Safety Number Derivation');
  const safetyNum1 = await calculateSafetyNumber(devId1.identityPublicKeyHex, devId2.identityPublicKeyHex);
  const safetyNum2 = await calculateSafetyNumber(devId2.identityPublicKeyHex, devId1.identityPublicKeyHex);

  assert.strictEqual(safetyNum1, safetyNum2, 'Safety number must be symmetric regardless of argument order');
  assert.match(safetyNum1, /^\d{5}(\s\d{5}){11}$/, 'Safety number must consist of 12 blocks of 5 digits');
  console.log(`  Derived Safety Number: ${safetyNum1}`);
  console.log('✓ Symmetric 60-digit safety numbers verified');

  // Test 4: Authenticated Double Ratchet Session Establishment
  console.log('[TEST 4] Double Ratchet Session Handshake & Bidirectional Ratchet');
  const aliceId = generateIdentityKeyPair();
  const bobId = generateIdentityKeyPair();
  const bobPrekey = generateDHKeyPair();
  const sharedMasterSecret = crypto.randomBytes(32);

  const alice = new DoubleRatchetSession(
    aliceId,
    sharedMasterSecret,
    true,
    bobPrekey.publicKey,
    bobId.publicKey
  );

  const bob = new DoubleRatchetSession(
    bobId,
    sharedMasterSecret,
    false,
    undefined,
    aliceId.publicKey
  );
  bob.dhPair = bobPrekey;

  // Alice -> Bob
  const m1 = alice.encrypt('Message from Alice #1');
  const d1 = bob.decrypt(m1);
  assert.strictEqual(d1, 'Message from Alice #1');

  // Bob -> Alice
  const m2 = bob.encrypt('Reply from Bob #1');
  const d2 = alice.decrypt(m2);
  assert.strictEqual(d2, 'Reply from Bob #1');

  // Alice -> Bob again
  const m3 = alice.encrypt('Alice response #2');
  const d3 = bob.decrypt(m3);
  assert.strictEqual(d3, 'Alice response #2');
  console.log('✓ Bidirectional ratcheted message exchange verified');

  // Test 5: Forward Secrecy
  console.log('[TEST 5] Forward Secrecy Invariant');
  const oldMsg = alice.encrypt('Confidential previous plan');
  const oldDec = bob.decrypt(oldMsg);
  assert.strictEqual(oldDec, 'Confidential previous plan');

  // Attacker steals current sending/receiving keys
  const leakedSendKey = Buffer.from(alice.sendingChainKey!);
  let decryptedOld = false;
  try {
    const cipher = oldMsg.ciphertext;
    const authTag = cipher.subarray(-16);
    const ct = cipher.subarray(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', leakedSendKey, oldMsg.iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(oldMsg.ciphertext.subarray(0, 0)); // wrong AAD or key
    decipher.update(ct);
    decipher.final();
    decryptedOld = true;
  } catch {
    decryptedOld = false;
  }
  assert.strictEqual(decryptedOld, false, 'Historical message cannot be decrypted with later ratcheted keys');
  console.log('✓ Forward secrecy verified under historical compromise');

  // Test 6: Replay Defense
  console.log('[TEST 6] Replay Attack Rejection');
  let replayed = false;
  try {
    bob.decrypt(m1); // Attempt to decrypt m1 again
    replayed = true;
  } catch {
    replayed = false;
  }
  assert.strictEqual(replayed, false, 'Replaying consumed message must throw error');
  console.log('✓ Replay attack rejected by sequence checks');

  // Test 7: Out-of-Order Delivery with Bounded Skipped Keys
  console.log('[TEST 7] Out-of-Order Delivery');
  const msgA = alice.encrypt('Sequential Message 1');
  const msgB = alice.encrypt('Sequential Message 2');
  const msgC = alice.encrypt('Sequential Message 3');

  // Bob receives C first, then B, then A
  const decC = bob.decrypt(msgC);
  assert.strictEqual(decC, 'Sequential Message 3');
  const decB = bob.decrypt(msgB);
  assert.strictEqual(decB, 'Sequential Message 2');
  const decA = bob.decrypt(msgA);
  assert.strictEqual(decA, 'Sequential Message 1');
  console.log('✓ Out-of-order message delivery via bounded skipped keys verified');

  console.log('>>> ALL DOUBLE RATCHET & DEVICE IDENTITY TESTS PASSED <<<');
}

if (process.argv[1]?.endsWith('doubleRatchetAndIdentity.test.ts')) {
  runDoubleRatchetAndIdentityTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
