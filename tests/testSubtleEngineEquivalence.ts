import { hkdfDerive, sha256Digest, aesGcmEncrypt, aesGcmDecrypt } from '../packages/crypto/subtleEngine';
import crypto from 'node:crypto';

async function testEquivalence() {
  console.log('Testing Subtle Engine vs Native WebCrypto Equivalence...\n');

  const webCrypto = crypto.webcrypto as unknown as Crypto;

  // 1. SHA-256 Digest Equivalence
  const testData = new TextEncoder().encode('Hello ENCLAVE Secure World!');
  const nativeDigest = new Uint8Array(await webCrypto.subtle.digest('SHA-256', testData));
  const engineDigest = await sha256Digest(testData);

  const nativeDigestHex = Buffer.from(nativeDigest).toString('hex');
  const engineDigestHex = Buffer.from(engineDigest).toString('hex');

  console.log('1. SHA-256 Digest:');
  console.log('   Native:', nativeDigestHex);
  console.log('   Engine:', engineDigestHex);
  if (nativeDigestHex !== engineDigestHex) {
    throw new Error('SHA-256 Digest mismatch!');
  }
  console.log('   MATCH: PASS\n');

  // 2. HKDF-SHA256 Equivalence
  const ikm = crypto.randomBytes(32);
  const salt = crypto.randomBytes(32);
  const info = new TextEncoder().encode('ENCLAVE v1 | Key Wrapping Key');

  const nativeKeyMaterial = await webCrypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const nativeDerivedBits = new Uint8Array(await webCrypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    nativeKeyMaterial,
    256
  ));

  const engineDerivedBits = await hkdfDerive(ikm, salt, info, 32);

  const nativeBitsHex = Buffer.from(nativeDerivedBits).toString('hex');
  const engineBitsHex = Buffer.from(engineDerivedBits).toString('hex');

  console.log('2. HKDF-SHA256 Derivation:');
  console.log('   Native:', nativeBitsHex);
  console.log('   Engine:', engineBitsHex);
  if (nativeBitsHex !== engineBitsHex) {
    throw new Error('HKDF-SHA256 mismatch!');
  }
  console.log('   MATCH: PASS\n');

  // 3. AES-256-GCM Encryption / Decryption Equivalence
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const aad = new TextEncoder().encode('ENCLAVE-v1|ROOM:test|PKT:123|SEQ:1');
  const plaintext = new TextEncoder().encode('Ultra confidential secret message transmitted over ENCLAVE');

  // Encrypt with native WebCrypto
  const nativeAesKey = await webCrypto.subtle.importKey('raw', aesKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const nativeEncrypted = new Uint8Array(await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
    nativeAesKey,
    plaintext
  ));

  // Encrypt with fallback Engine
  const engineEncrypted = aesGcmEncrypt(aesKey, iv, plaintext, aad, 128);

  const nativeCipherHex = Buffer.from(nativeEncrypted).toString('hex');
  const engineCipherHex = Buffer.from(engineEncrypted).toString('hex');

  console.log('3. AES-256-GCM Encryption:');
  console.log('   Native ciphertext+tag:', nativeCipherHex);
  console.log('   Engine ciphertext+tag:', engineCipherHex);
  if (nativeCipherHex !== engineCipherHex) {
    throw new Error('AES-256-GCM Ciphertext mismatch!');
  }
  console.log('   MATCH: PASS\n');

  // Cross-decrypt: Native decrypts Engine ciphertext
  const decryptedByNative = new Uint8Array(await webCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
    nativeAesKey,
    engineEncrypted
  ));
  const nativeDecoded = new TextDecoder().decode(decryptedByNative);

  // Cross-decrypt: Engine decrypts Native ciphertext
  const decryptedByEngine = aesGcmDecrypt(aesKey, iv, nativeEncrypted, aad, 128);
  const engineDecoded = new TextDecoder().decode(decryptedByEngine);

  console.log('4. Cross-Decryption:');
  console.log('   Decrypted by Native:', nativeDecoded);
  console.log('   Decrypted by Engine:', engineDecoded);

  if (nativeDecoded !== 'Ultra confidential secret message transmitted over ENCLAVE' || engineDecoded !== 'Ultra confidential secret message transmitted over ENCLAVE') {
    throw new Error('Cross-decryption failed!');
  }
  console.log('   CROSS-DECRYPT: PASS\n');

  // 5. Auth Tag Tampering Verification
  console.log('5. Auth Tag Tampering Rejection:');
  const tamperedEncrypted = new Uint8Array(engineEncrypted);
  tamperedEncrypted[tamperedEncrypted.length - 1] ^= 0x01; // flip 1 bit in tag

  let caughtNative = false;
  try {
    await webCrypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 },
      nativeAesKey,
      tamperedEncrypted
    );
  } catch {
    caughtNative = true;
  }

  let caughtEngine = false;
  try {
    aesGcmDecrypt(aesKey, iv, tamperedEncrypted, aad, 128);
  } catch {
    caughtEngine = true;
  }

  console.log('   Native caught tampering:', caughtNative);
  console.log('   Engine caught tampering:', caughtEngine);
  if (!caughtNative || !caughtEngine) {
    throw new Error('Tampering detection failed!');
  }
  console.log('   TAMPERING REJECTION: PASS\n');

  console.log('ALL EQUIVALENCE TESTS PASSED 100%!');
}

testEquivalence().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
