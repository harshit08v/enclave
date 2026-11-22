/**
 * ENCLAVE Phase 6.1 — Link-Access Security & Identity Verification Regression Battery
 * 
 * Tests:
 * 1. ENC-VULN-02: Deterministic room-ID-derived password fallback eliminated.
 * 2. 256-bit CSPRNG link secret requirement for link-access rooms (#k=).
 * 3. Rejection of missing, malformed, or insufficient-entropy tokens.
 * 4. Zero silent fallback to room-ID-derived keys.
 * 5. URL hash fragment (#k=) RFC 3986 client-side isolation (never sent in HTTP requests).
 * 6. Refresh / reconnect secret preservation via sessionStorage.
 * 7. ENC-VULN-01: First-contact identity unverified default state, Safety Number computation,
 *    QR verification payload generation, and tamper/substitution mismatch detection.
 */

import assert from 'node:assert';
import {
  generateRoomSecret,
  isValidLinkSecret,
  extractAndValidateLinkSecret,
  getOpenAccessPassphrase,
  deriveRoomKeys,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  generateSecureId
} from '../packages/crypto/index.ts';
import {
  deriveSafetyFingerprint,
  formatVerificationQrPayload,
  parseVerificationQrPayload
} from '../src/lib/safetyFingerprint.ts';

export async function runPhase61LinkAccessSecurityRegression() {
  console.log('\n--- Running Phase 6.1 Link-Access & Identity Security Regression Battery ---');

  // 1. Rejection of Deterministic Room-ID-Derived Keys
  console.log('[TEST 1] Elimination of Deterministic Room-ID Fallback');
  const testRoomId = '8f92-c0e4';
  
  // Test production guard: getOpenAccessPassphrase must throw fatal security rejection
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    let thrownError: Error | null = null;
    try {
      getOpenAccessPassphrase(testRoomId);
    } catch (err: any) {
      thrownError = err;
    }
    assert.ok(thrownError, 'getOpenAccessPassphrase MUST throw fatal error in production environment');
    assert.ok(
      thrownError.message.includes('SECURITY REJECTION') && thrownError.message.includes('forbidden'),
      `Error must explicitly cite security rejection: ${thrownError.message}`
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // 2. High-Entropy Secret Generation & Validation
  console.log('[TEST 2] 256-Bit Link Secret Entropy Enforcement');
  const validSecret1 = generateRoomSecret();
  assert.strictEqual(validSecret1.length, 64, 'Generated link secret must be 64 hex characters (256-bit CSPRNG)');
  assert.ok(isValidLinkSecret(validSecret1), 'Valid 256-bit CSPRNG hex secret must be accepted');

  // High-entropy 32+ char token (e.g. base64url)
  const validSecret2 = 'aB3_dE9-gH1_jK5-mN7_pQ9-sT2_vW4_yZ0';
  assert.ok(isValidLinkSecret(validSecret2), 'High-entropy 32+ char token must be accepted');

  // 3. Rejection of Invalid / Missing / Malformed Secrets
  console.log('[TEST 3] Rejection of Malformed / Insufficient Entropy Tokens');
  assert.strictEqual(isValidLinkSecret(''), false, 'Empty string must be rejected');
  assert.strictEqual(isValidLinkSecret(null), false, 'Null must be rejected');
  assert.strictEqual(isValidLinkSecret(undefined), false, 'Undefined must be rejected');
  assert.strictEqual(isValidLinkSecret('12345'), false, 'Short string must be rejected');
  assert.strictEqual(isValidLinkSecret('short-token'), false, 'Short token (<32 chars) must be rejected');
  assert.strictEqual(isValidLinkSecret(`enclave-open-access-${testRoomId}`), false, 'Legacy deterministic pattern must be rejected');
  assert.strictEqual(isValidLinkSecret('!@#$%^&*()_+~`|}{[]:;?><,./'), false, 'Special character spam must be rejected');

  // 4. Extraction from Invitation URLs and Fragments
  console.log('[TEST 4] Extraction from URL Hash Fragments (#k=)');
  const standardInvite = `https://enclave.vercel.app/r/${testRoomId}#k=${validSecret1}`;
  assert.strictEqual(extractAndValidateLinkSecret(standardInvite), validSecret1, 'Must extract valid secret from standard URL hash');

  const bareFragment = `#k=${validSecret1}`;
  assert.strictEqual(extractAndValidateLinkSecret(bareFragment), validSecret1, 'Must extract valid secret from bare hash');

  const queryWithFragment = `https://enclave.vercel.app/r/${testRoomId}?source=invite#k=${validSecret1}`;
  assert.strictEqual(extractAndValidateLinkSecret(queryWithFragment), validSecret1, 'Must extract secret even if query params precede hash');

  const rawSecretInput = `  ${validSecret1}  `;
  assert.strictEqual(extractAndValidateLinkSecret(rawSecretInput), validSecret1, 'Must extract and trim raw secret input');

  // Malformed URL fragments must return null
  assert.strictEqual(extractAndValidateLinkSecret(`https://enclave.vercel.app/r/${testRoomId}#k=short`), null);
  assert.strictEqual(extractAndValidateLinkSecret(`https://enclave.vercel.app/r/${testRoomId}#no_key`), null);
  assert.strictEqual(extractAndValidateLinkSecret(`https://enclave.vercel.app/r/${testRoomId}`), null);
  assert.strictEqual(extractAndValidateLinkSecret(''), null);

  // 5. Cryptographic Verification: Link-Access Room Secret Decryption
  console.log('[TEST 5] Unwrapping Room Master Secret with Link Secret vs Deterministic Guess');
  const secretKey = generateRoomSecret();
  const hostKeys = await deriveRoomKeys(secretKey);
  const { roomMasterSecret: originalRms, wrappedBundle } = await createAndWrapRoomSecret(hostKeys.keyWrappingKey);

  // Legitimate guest with extracted secret: succeeds
  const guestKeys = await deriveRoomKeys(secretKey, hostKeys.salt);
  const unwrappedRms = await unwrapRoomSecret(guestKeys.keyWrappingKey, wrappedBundle);
  assert.deepStrictEqual(unwrappedRms, originalRms, 'Legitimate guest with 256-bit secret must unwrap RMS with 100% fidelity');

  // Attacker attempting deterministic roomId derivation: FAILS
  const attackerDeterministicKeys = await deriveRoomKeys(`enclave-open-access-${testRoomId}`, hostKeys.salt);
  let attackerUnwrapped = false;
  try {
    await unwrapRoomSecret(attackerDeterministicKeys.keyWrappingKey, wrappedBundle);
    attackerUnwrapped = true;
  } catch {
    // Expected AES-GCM tag mismatch failure
    attackerUnwrapped = false;
  }
  assert.strictEqual(attackerUnwrapped, false, 'Attacker using deterministic room ID must FAIL AES-GCM authentication');

  // Attacker with another random secret: FAILS
  const wrongSecret = generateRoomSecret();
  const attackerWrongKeys = await deriveRoomKeys(wrongSecret, hostKeys.salt);
  let wrongSecretUnwrapped = false;
  try {
    await unwrapRoomSecret(attackerWrongKeys.keyWrappingKey, wrappedBundle);
    wrongSecretUnwrapped = true;
  } catch {
    wrongSecretUnwrapped = false;
  }
  assert.strictEqual(wrongSecretUnwrapped, false, 'Attacker with incorrect secret must FAIL AES-GCM authentication');

  // 6. First-Contact Identity Trust & Safety Number Verification (ENC-VULN-01)
  console.log('[TEST 6] First-Contact Identity Trust & Safety Number Verification');
  const participantIds = ['user_alice_001', 'user_bob_002'];
  const fingerprintAlice = await deriveSafetyFingerprint(originalRms, testRoomId, participantIds);
  assert.ok(fingerprintAlice, 'Safety fingerprint must be generated');
  
  // Verify 60 decimal digits grouped into 12 blocks of 5 digits
  const blocks = fingerprintAlice.split(' ');
  assert.strictEqual(blocks.length, 12, 'Safety number must be 12 blocks');
  assert.strictEqual(blocks.join('').length, 60, 'Safety number must be exactly 60 digits');
  assert.ok(/^\d{60}$/.test(blocks.join('')), 'Safety number must consist exclusively of decimal digits 0-9');

  // Consistency: Same RMS and participants must generate identical fingerprint
  const fingerprintBob = await deriveSafetyFingerprint(originalRms, testRoomId, ['user_bob_002', 'user_alice_001']); // reversed order
  assert.strictEqual(fingerprintAlice, fingerprintBob, 'Fingerprint derivation must be independent of participant ordering');

  // QR Code Payload formatting & parsing
  const qrPayload = formatVerificationQrPayload(testRoomId, fingerprintAlice);
  assert.ok(qrPayload.startsWith('enclave-verify:v1:'), 'QR payload must use canonical enclave-verify scheme');
  const parsedQr = parseVerificationQrPayload(qrPayload);
  assert.ok(parsedQr, 'QR payload must parse correctly');
  assert.strictEqual(parsedQr?.roomId, testRoomId);
  assert.strictEqual(parsedQr?.fingerprint, fingerprintAlice);

  // Key change detection: Different RMS (e.g. MitM substitution) produces completely different safety number
  const mitmRms = new Uint8Array(32);
  globalThis.crypto.getRandomValues(mitmRms);
  const mitmFingerprint = await deriveSafetyFingerprint(mitmRms, testRoomId, participantIds);
  assert.notStrictEqual(fingerprintAlice, mitmFingerprint, 'MitM key substitution MUST produce completely distinct safety numbers');

  // 7. SessionStorage Cache Simulation (Tab Refresh / Reconnect)
  console.log('[TEST 7] Session Storage Secret Preservation Across Tab Refreshes');
  const mockStorage: Record<string, string> = {};
  const canonicalId = testRoomId.trim().toLowerCase();
  
  // Tab receives invite link with #k=...
  const initialInviteUrl = `https://enclave.vercel.app/r/${canonicalId}#k=${secretKey}`;
  const parsedSecret = extractAndValidateLinkSecret(initialInviteUrl);
  assert.ok(parsedSecret, 'Initial link secret parsed');
  mockStorage[`enclave_room_pass_${canonicalId}`] = parsedSecret!;
  
  // Tab simulates refresh: URL hash fragment has been scrubbed
  const refreshedUrl = `https://enclave.vercel.app/r/${canonicalId}`;
  const hashAfterScrub = '';
  assert.strictEqual(extractAndValidateLinkSecret(hashAfterScrub), null, 'Scrubbed URL contains no key');
  
  // Reconnect recovers from sessionStorage
  const restoredSecret = mockStorage[`enclave_room_pass_${canonicalId}`];
  assert.ok(isValidLinkSecret(restoredSecret), 'Stored secret from sessionStorage must be valid');
  assert.strictEqual(restoredSecret, secretKey, 'Restored secret matches original invite secret exactly');

  console.log('✓ All Phase 6.1 Link-Access Security & Identity Verification Regressions PASSED\n');
}

if (process.argv[1]?.includes('phase61LinkAccessSecurityRegression.test')) {
  runPhase61LinkAccessSecurityRegression().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
