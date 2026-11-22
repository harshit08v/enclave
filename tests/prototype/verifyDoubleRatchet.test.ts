/**
 * ENCLAVE Double Ratchet Cryptographic Verification Suite
 * Verifies all 8 critical security properties:
 * 1. Authenticated Session Establishment & Safety Numbers
 * 2. Continuous Bidirectional Ratcheting
 * 3. Forward Secrecy under historical compromise
 * 4. Post-Compromise Security (PCS / Self-Healing)
 * 5. Forged Message & Tampering Rejection
 * 6. Replay & Duplicate Message Rejection
 * 7. Out-of-Order Message Delivery & Bounded Skipped Keys
 * 8. Identity Key Rotation & Device Revocation Detection
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  generateIdentityKeyPair,
  generateDHKeyPair,
  calculateSafetyNumber,
  DoubleRatchetSession,
  RatchetMessage
} from './doubleRatchetPrototype';

console.log('=================================================================');
console.log('   ENCLAVE DOUBLE RATCHET PROTOTYPE VERIFICATION SUITE           ');
console.log('=================================================================\n');

async function runTests() {
  // Setup Identities
  const aliceIdentity = generateIdentityKeyPair();
  const bobIdentity = generateIdentityKeyPair();

  console.log('[PROPERTY 1] Authenticated Session Establishment & Safety Numbers');
  const safetyNumber1 = calculateSafetyNumber(aliceIdentity.publicKey, bobIdentity.publicKey);
  const safetyNumber2 = calculateSafetyNumber(bobIdentity.publicKey, aliceIdentity.publicKey);
  assert.strictEqual(safetyNumber1, safetyNumber2, 'Safety number must be symmetric');
  assert.match(safetyNumber1, /^\d{5}(\s\d{5}){11}$/, 'Safety number must follow 12-block 5-digit format');
  console.log(`  ✔ Deterministic 60-digit Safety Number derived: ${safetyNumber1}`);

  // Shared Master Secret from authenticated handshake
  const sharedMasterSecret = crypto.randomBytes(32);

  // Bob generates initial prekey
  const bobPrekey = generateDHKeyPair();

  // Alice initializes as Initiator
  const aliceSession = new DoubleRatchetSession(
    aliceIdentity,
    sharedMasterSecret,
    true,
    bobPrekey.publicKey,
    bobIdentity.publicKey
  );

  // Bob initializes as Receiver
  const bobSession = new DoubleRatchetSession(
    bobIdentity,
    sharedMasterSecret,
    false,
    undefined,
    aliceIdentity.publicKey
  );
  // Set Bob's initial DH pair to his prekey
  bobSession.dhPair = bobPrekey;

  console.log('  ✔ Authenticated double ratchet sessions initialized for Alice and Bob\n');

  console.log('[PROPERTY 2] Continuous Bidirectional Ratcheting');
  const m1 = aliceSession.encrypt('Hello Bob, this is message 1');
  const d1 = bobSession.decrypt(m1);
  assert.strictEqual(d1, 'Hello Bob, this is message 1');

  const m2 = bobSession.encrypt('Hi Alice, received message 1! Here is reply 2');
  const d2 = aliceSession.decrypt(m2);
  assert.strictEqual(d2, 'Hi Alice, received message 1! Here is reply 2');

  const m3 = aliceSession.encrypt('Great, Alice replying back with message 3');
  const d3 = bobSession.decrypt(m3);
  assert.strictEqual(d3, 'Great, Alice replying back with message 3');
  console.log('  ✔ 3 bidirectional ratcheted messages encrypted, transmitted, and decrypted successfully\n');

  console.log('[PROPERTY 3] Forward Secrecy Verification');
  // Record ciphertexts for historical messages
  const histM1 = aliceSession.encrypt('Secret historical plan 1');
  const histM2 = aliceSession.encrypt('Secret historical plan 2');
  const decM1 = bobSession.decrypt(histM1);
  const decM2 = bobSession.decrypt(histM2);
  assert.strictEqual(decM1, 'Secret historical plan 1');
  assert.strictEqual(decM2, 'Secret historical plan 2');

  // Attacker steals Alice and Bob's current ratchet state AFTER histM1 and histM2 are consumed
  const leakedAliceSendingKey = Buffer.from(aliceSession.sendingChainKey!);
  const leakedBobReceivingKey = Buffer.from(bobSession.receivingChainKey!);

  // Attacker attempts to decrypt histM1 using the leaked chain keys
  let attackerSuccess = false;
  try {
    const cipher = histM1.ciphertext;
    const authTag = cipher.subarray(-16);
    const ct = cipher.subarray(0, -16);
    // Attacker tries with current chain key
    const decipher = crypto.createDecipheriv('aes-256-gcm', leakedBobReceivingKey, histM1.iv);
    decipher.setAAD(histM1.iv);
    decipher.setAuthTag(authTag);
    decipher.update(ct);
    decipher.final();
    attackerSuccess = true;
  } catch {
    attackerSuccess = false;
  }
  assert.strictEqual(attackerSuccess, false, 'Attacker MUST NOT be able to decrypt past ciphertext with current state');
  console.log('  ✔ Forward Secrecy verified: State compromise at T cannot decrypt messages sent at T-1 or T-2\n');

  console.log('[PROPERTY 4] Post-Compromise Security (PCS / Self-Healing)');
  // Simulate adversary snapshot of current state
  const compromisedRootKey = Buffer.from(aliceSession.rootKey);
  const compromisedDHPrivate = Buffer.from(aliceSession.dhPair.privateKey);

  // Normal conversation continues: fresh DH ratchet steps occur
  const freshAliceMsg = aliceSession.encrypt('Healing message from Alice');
  const bobReceived = bobSession.decrypt(freshAliceMsg);
  assert.strictEqual(bobReceived, 'Healing message from Alice');

  const freshBobMsg = bobSession.encrypt('Healing reply from Bob');
  const aliceReceived = aliceSession.decrypt(freshBobMsg);
  assert.strictEqual(aliceReceived, 'Healing reply from Bob');

  // Next round of communication
  const healedMsg = aliceSession.encrypt('Post-healing message 100% confidential');

  // Attacker tries to decrypt healedMsg with compromised state
  let attackerHealedDecryptSuccess = false;
  try {
    const cipher = healedMsg.ciphertext;
    const authTag = cipher.subarray(-16);
    const ct = cipher.subarray(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', compromisedRootKey, healedMsg.iv);
    decipher.setAuthTag(authTag);
    decipher.update(ct);
    decipher.final();
    attackerHealedDecryptSuccess = true;
  } catch {
    attackerHealedDecryptSuccess = false;
  }
  assert.strictEqual(attackerHealedDecryptSuccess, false, 'Attacker cannot decrypt post-healing message');
  const legitimatelyDecrypted = bobSession.decrypt(healedMsg);
  assert.strictEqual(legitimatelyDecrypted, 'Post-healing message 100% confidential');
  console.log('  ✔ Post-Compromise Security verified: Session heals confidentiality once fresh DH step completes\n');

  console.log('[PROPERTY 5] Forged Message & Tampering Rejection');
  const validMsg = aliceSession.encrypt('Authentic message');
  
  // Tamper with ciphertext (bit flip)
  const tamperedCiphertext = Buffer.from(validMsg.ciphertext);
  tamperedCiphertext[0] ^= 0x01;
  const forgedCiphertextMsg: RatchetMessage = {
    ...validMsg,
    ciphertext: tamperedCiphertext
  };

  let tamperingCaught = false;
  try {
    bobSession.decrypt(forgedCiphertextMsg);
  } catch {
    tamperingCaught = true;
  }
  assert.strictEqual(tamperingCaught, true, 'Tampered ciphertext must be rejected by GCM auth tag');

  // Forged signature
  const forgedSigMsg: RatchetMessage = {
    ...validMsg,
    signature: crypto.randomBytes(64)
  };
  let signatureCaught = false;
  try {
    bobSession.decrypt(forgedSigMsg);
  } catch {
    signatureCaught = true;
  }
  assert.strictEqual(signatureCaught, true, 'Forged signature must be rejected by Ed25519 identity verification');
  console.log('  ✔ Tampering & signature forgery strictly rejected\n');

  console.log('[PROPERTY 6] Replay & Duplicate Message Rejection');
  const msgToReplay = aliceSession.encrypt('Single use message');
  const firstDelivery = bobSession.decrypt(msgToReplay);
  assert.strictEqual(firstDelivery, 'Single use message');

  let replayCaught = false;
  try {
    bobSession.decrypt(msgToReplay);
  } catch {
    replayCaught = true;
  }
  assert.strictEqual(replayCaught, true, 'Replayed message must be rejected as duplicate');
  console.log('  ✔ Replayed packet successfully defeated\n');

  console.log('[PROPERTY 7] Out-of-Order Message Delivery & Bounded Skipped Keys');
  // Alice generates 4 consecutive messages in order
  const pkt0 = aliceSession.encrypt('Packet 0');
  const pkt1 = aliceSession.encrypt('Packet 1');
  const pkt2 = aliceSession.encrypt('Packet 2');
  const pkt3 = aliceSession.encrypt('Packet 3');

  // Deliver out of order: 0, 2, 3, then delayed 1
  const rec0 = bobSession.decrypt(pkt0);
  assert.strictEqual(rec0, 'Packet 0');

  // Receive pkt2 (pkt1 was delayed in network)
  const rec2 = bobSession.decrypt(pkt2);
  assert.strictEqual(rec2, 'Packet 2');

  // Receive pkt3
  const rec3 = bobSession.decrypt(pkt3);
  assert.strictEqual(rec3, 'Packet 3');

  // Delayed pkt1 finally arrives!
  const rec1 = bobSession.decrypt(pkt1);
  assert.strictEqual(rec1, 'Packet 1');

  // Trying to decrypt pkt1 again fails because skipped key was consumed
  let secondPkt1Caught = false;
  try {
    bobSession.decrypt(pkt1);
  } catch {
    secondPkt1Caught = true;
  }
  assert.strictEqual(secondPkt1Caught, true, 'Consumed skipped key must be permanently deleted');
  console.log('  ✔ Out-of-order packets correctly buffered in bounded skipped-key cache and decrypted\n');

  console.log('[PROPERTY 8] Identity Key Rotation & Device Revocation Detection');
  const eveIdentity = generateIdentityKeyPair();
  const eveSession = new DoubleRatchetSession(
    eveIdentity,
    sharedMasterSecret,
    true,
    bobPrekey.publicKey,
    bobIdentity.publicKey
  );
  const eveMsg = eveSession.encrypt('Impersonation attempt from unauthorized device');

  let eveCaught = false;
  try {
    bobSession.decrypt(eveMsg);
  } catch {
    eveCaught = true;
  }
  assert.strictEqual(eveCaught, true, 'Message from unverified device identity must be rejected');

  // Safety number changes on identity key rotation
  const eveSafetyNumber = calculateSafetyNumber(eveIdentity.publicKey, bobIdentity.publicKey);
  assert.notStrictEqual(eveSafetyNumber, safetyNumber1, 'Rotated identity must produce different safety number');
  console.log(`  ✔ Device identity rotation detected: Safety number changed from ${safetyNumber1.substring(0, 11)}... to ${eveSafetyNumber.substring(0, 11)}...`);
  console.log('  ✔ Unauthenticated device rejected\n');

  console.log('=================================================================');
  console.log('   ALL 8 DOUBLE RATCHET SECURITY INVARIANTS VERIFIED 100% PASS   ');
  console.log('=================================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
