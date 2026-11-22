import {
  generateRoomSecret,
  isValidLinkSecret,
  extractAndValidateLinkSecret,
  getOpenAccessPassphrase,
  deriveRoomKeys,
  createAndWrapRoomSecret,
  generateAdminKeyPair,
  generateSecureId,
  unwrapRoomSecret
} from '../packages/crypto/index.js';

const STAGING_URL = process.env.STAGING_URL || 'https://enclave-f9z6evy26-trakson.vercel.app';

async function runStagingVerification() {
  console.log(`[STAGING VERIFICATION] Starting live staging audit against: ${STAGING_URL}`);

  // Test 1: Staging Availability & Security Headers
  console.log('\n--- 1. Testing Root & Security Headers ---');
  const rootRes = await fetch(`${STAGING_URL}/`);
  console.log(`Root status: ${rootRes.status} ${rootRes.statusText}`);
  if (rootRes.status !== 200) {
    throw new Error(`Expected root status 200, got ${rootRes.status}`);
  }
  const headers = Object.fromEntries(rootRes.headers.entries());
  console.log('Security headers present:');
  console.log('- x-content-type-options:', headers['x-content-type-options'] || 'not present');
  console.log('- x-frame-options:', headers['x-frame-options'] || 'not present');
  console.log('- strict-transport-security:', headers['strict-transport-security'] || 'not present');

  // Test 2: Client-side cryptographic preparation for Passwordless Room
  console.log('\n--- 2. Generating Client-Side Cryptographic Parameters ---');
  const rawHex = generateSecureId('', 4);
  const roomId = `stg-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}`;
  console.log('Generated Room ID:', roomId);

  // High-entropy 256-bit CSPRNG link secret for passwordless room
  const linkSecret = generateRoomSecret();
  console.log('Generated 256-bit Link Secret (base64url):', linkSecret);
  if (!isValidLinkSecret(linkSecret)) {
    throw new Error('generateRoomSecret() output failed isValidLinkSecret check');
  }

  // Derive keys using Argon2id
  console.log('Deriving Argon2id room keys...');
  const keyBundle = await deriveRoomKeys(linkSecret);
  const adminKeys = await generateAdminKeyPair();
  const { wrappedBundle, roomMasterSecret } = await createAndWrapRoomSecret(keyBundle.keyWrappingKey);

  console.log('Key bundle generated. Salt length:', keyBundle.salt.length);
  console.log('Master secret wrapped with KWK. Wrapped key length:', wrappedBundle.wrappedKey.length);

  // Test 3: Create Passwordless Room via POST /api/rooms
  console.log('\n--- 3. Testing POST /api/rooms on Staging ---');
  const createRes = await fetch(`${STAGING_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      salt: keyBundle.salt,
      authCommitment: keyBundle.authCommitment,
      wrappedSecretBundle: wrappedBundle,
      oneTimeAccess: false,
      requirePass: false,
      accessMode: 'without_pass',
      adminPublicKey: adminKeys.publicKey,
      relayAuthKey: keyBundle.relayAuthKey,
    }),
  });

  console.log(`Create room status: ${createRes.status} ${createRes.statusText}`);
  const roomData = await createRes.json();
  if (createRes.status !== 200 && createRes.status !== 201) {
    throw new Error(`Failed to create room: ${JSON.stringify(roomData)}`);
  }

  console.log('PASS: Room created successfully.');
  const createdRoom = roomData.room || roomData;
  console.log('Returned ID:', createdRoom.id);
  console.log('Returned requirePass:', createdRoom.requirePass);
  console.log('Returned accessMode:', createdRoom.accessMode);

  // Test 4: Verify Zero Secret Leakage in Server Response
  console.log('\n--- 4. Verifying Server Zero-Knowledge Secret Invariant ---');
  if (roomData.passphrase || roomData.password || roomData.secret || roomData.linkSecret ||
      createdRoom.passphrase || createdRoom.password || createdRoom.secret || createdRoom.linkSecret) {
    throw new Error('[CRITICAL FAILURE] Server exposed secret in room creation response!');
  }
  console.log('PASS: Server returns ZERO secret or key material in POST response.');

  // Test 5: Verify GET /api/rooms/[roomId] Zero-Knowledge
  console.log('\n--- 5. Verifying GET /api/rooms/[roomId] Metadata ---');
  const fetchRes = await fetch(`${STAGING_URL}/api/rooms/${roomId}`);
  console.log(`Fetch room status: ${fetchRes.status} ${fetchRes.statusText}`);
  const fetchedMeta = await fetchRes.json();
  if (fetchedMeta.id !== roomId) {
    throw new Error(`Fetched ID mismatch: expected ${roomId}, got ${fetchedMeta.id}`);
  }
  if (fetchedMeta.passphrase || fetchedMeta.secret || fetchedMeta.key || fetchedMeta.authCommitment || fetchedMeta.relayAuthKey) {
    throw new Error('[CRITICAL FAILURE] Server exposed sensitive keys in GET response!');
  }
  console.log('PASS: GET /api/rooms/[roomId] exposes zero encryption keys or auth secrets.');

  // Test 6: Verify E2EE Key Unwrapping on Joining Side
  console.log('\n--- 6. Verifying Joining Side E2EE Master Secret Unwrapping ---');
  // Joining peer receives link: https://.../r/[roomId]#k=[linkSecret]
  const joinerExtractedSecret = extractAndValidateLinkSecret(`#k=${linkSecret}`);
  if (!joinerExtractedSecret) {
    throw new Error('Failed to extract secret from #k= hash fragment');
  }

  const joinerKeys = await deriveRoomKeys(joinerExtractedSecret, fetchedMeta.salt);

  // Unwrap master secret with valid secret
  const unwrappedMasterSecret = await unwrapRoomSecret(
    joinerKeys.keyWrappingKey,
    fetchedMeta.wrappedSecretBundle
  );

  const originalHex = Buffer.from(roomMasterSecret).toString('hex');
  const unwrappedHex = Buffer.from(unwrappedMasterSecret).toString('hex');

  if (unwrappedHex !== originalHex) {
    throw new Error('Unwrapped master secret does not match original master secret!');
  }
  console.log('PASS: E2EE Master Secret successfully unwrapped by peer using #k= secret.');

  // Verify that an incorrect or attacker-chosen key CANNOT unwrap the secret
  const attackerSecret = generateRoomSecret();
  const attackerKeys = await deriveRoomKeys(attackerSecret, fetchedMeta.salt);
  let attackerUnwrapped = false;
  try {
    await unwrapRoomSecret(
      attackerKeys.keyWrappingKey,
      fetchedMeta.wrappedSecretBundle
    );
    attackerUnwrapped = true;
  } catch (err) {
    console.log('PASS: Attacker key correctly failed AES-GCM authentication during unwrap.');
  }
  if (attackerUnwrapped) {
    throw new Error('[CRITICAL FAILURE] Attacker secret unwrapped AES-GCM bundle without valid key!');
  }

  // Test 7: Rejection of Invalid / Truncated / Deterministic Secrets
  console.log('\n--- 7. Link Secret Strict Validation & Rejection ---');
  const invalidCases = [
    { name: 'empty string', val: '' },
    { name: 'short character string (16 chars)', val: 'a'.repeat(16) },
    { name: 'truncated character string (31 chars)', val: 'b'.repeat(31) },
    { name: 'invalid chars containing punctuation', val: 'not_valid_secret_because_it_has_punctuations!!!' },
    { name: 'null/undefined', val: null as any },
  ];

  for (const tc of invalidCases) {
    const valid = isValidLinkSecret(tc.val);
    if (valid) {
      throw new Error(`[SECURITY FAILURE] Invalid secret '${tc.name}' was accepted!`);
    }
    console.log(`PASS: Rejected ${tc.name}`);
  }

  // Test 8: URL Hash Fragment Extraction & Scrubbing Logic
  console.log('\n--- 8. URL Fragment Extraction Logic ---');
  const hashWithValidKey = `#k=${linkSecret}`;
  const extracted = extractAndValidateLinkSecret(hashWithValidKey);
  if (extracted !== linkSecret) {
    throw new Error(`Failed to extract valid secret from hash: expected ${linkSecret}, got ${extracted}`);
  }
  console.log('PASS: Successfully extracted valid secret from #k= fragment');

  const hashMissingKey = '#other_param=123';
  if (extractAndValidateLinkSecret(hashMissingKey) !== null) {
    throw new Error('Expected null when #k= is missing from hash');
  }
  console.log('PASS: Returned null when #k= is missing');

  const hashMalformedKey = '#k=tooshort';
  if (extractAndValidateLinkSecret(hashMalformedKey) !== null) {
    throw new Error('Expected null when #k= has invalid secret length');
  }
  console.log('PASS: Returned null for malformed #k= length');

  // Test 9: Production Guard on getOpenAccessPassphrase
  console.log('\n--- 9. Production Guard on getOpenAccessPassphrase ---');
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    getOpenAccessPassphrase(roomId);
    throw new Error('[CRITICAL FAILURE] getOpenAccessPassphrase did NOT throw in production mode!');
  } catch (err: any) {
    if (err.message && err.message.includes('[SECURITY REJECTION]')) {
      console.log('PASS: getOpenAccessPassphrase threw expected security exception in production:', err.message);
    } else {
      throw err;
    }
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  // Test 10: Staging Room Page HTTP Response Check
  console.log('\n--- 10. Staging Room Page Route Loading ---');
  const roomPageRes = await fetch(`${STAGING_URL}/r/${roomId}`);
  console.log(`Room page status: ${roomPageRes.status} ${roomPageRes.statusText}`);
  const roomPageHtml = await roomPageRes.text();
  console.log(`Room page HTML received: ${roomPageHtml.length} bytes`);
  if (roomPageRes.status !== 200) {
    throw new Error(`Expected room page status 200, got ${roomPageRes.status}`);
  }

  console.log('\n======================================================');
  console.log('ALL LIVE STAGING VERIFICATION CHECKS PASSED (10/10)');
  console.log('======================================================');
}

runStagingVerification().catch((err) => {
  console.error('\n[FATAL STAGING VERIFICATION ERROR]', err);
  process.exit(1);
});
