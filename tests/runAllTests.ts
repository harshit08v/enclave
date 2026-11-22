/**
 * ENCLAVE Master Verification Runner
 * Runs Cryptographic, Protocol, Lifecycle, Media, Profile, Share, and Adversarial test suites.
 */

import { runCryptoTests } from './crypto.test.ts';
import { runProtocolTests } from './protocol.test.ts';
import { runAdversarialTests } from './adversarial.test.ts';
import { runMediaTests } from './media.test.ts';
import { runProfileTests } from './profile.test.ts';
import { runShareTests } from './share.test.ts';
import { runLegalTests } from './legal.test.ts';
import { runAdminTests } from './admin.test.ts';
import { runEmailVerificationTests } from './emailVerification.test.ts';
import { runFirebaseAuthTests } from './firebaseAuth.test.ts';
import { runRoomAdapterTests } from './roomAdapter.test.ts';
import { runAccountAdminStoreTests } from './accountAdminStore.test.ts';
import { runPasswordResetTests } from './passwordReset.test.ts';
import { runWebRTCCallingTests } from './webrtcCalling.test.ts';
import { runPrivacyFeaturesTests } from './privacyFeatures.test.ts';
import { runSecurityRemediationRegressionTests } from './securityRemediationRegression.test.ts';
import { runDoubleRatchetAndIdentityTests } from './doubleRatchetAndIdentity.test.ts';
import { runLiveDoubleRatchetAndIdentitySecurityTests } from './liveDoubleRatchetAndIdentitySecurity.test.ts';
import { runPhase52StagingSafetyTests } from './phase52StagingSafety.test.ts';
import { runPhase53AdversarialTests } from './phase53Adversarial.test.ts';

async function main() {
  console.log('====================================================');
  console.log('  ENCLAVE FINAL POLISH SPRINT — TEST VERIFICATION   ');
  console.log('====================================================');

  try {
    await runCryptoTests();
    await runProtocolTests();
    await runAdversarialTests();
    await runMediaTests();
    await runProfileTests();
    await runShareTests();
    await runLegalTests();
    await runAdminTests();
    await runEmailVerificationTests();
    await runFirebaseAuthTests();
    await runRoomAdapterTests();
    await runAccountAdminStoreTests();
    await runPasswordResetTests();
    await runWebRTCCallingTests();
    await runPrivacyFeaturesTests();
    await runSecurityRemediationRegressionTests();
    await runDoubleRatchetAndIdentityTests();
    await runLiveDoubleRatchetAndIdentitySecurityTests();
    await runPhase52StagingSafetyTests();
    await runPhase53AdversarialTests();
    console.log('====================================================');
    console.log('  ALL 20 TEST SUITES EXECUTED WITH 100% PASS RATE   ');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE DETECTED:', err);
    process.exit(1);
  }
}

main();
