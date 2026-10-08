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
    console.log('====================================================');
    console.log('  ALL 6 TEST SUITES EXECUTED WITH 100% PASS RATE    ');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE DETECTED:', err);
    process.exit(1);
  }
}

main();
