import nodeCrypto from 'node:crypto';
import {
  deriveRoomKeys,
  createAndWrapRoomSecret,
  unwrapRoomSecret,
  deriveEphemeralSessionKey,
  encryptMessage,
  decryptMessage,
  encryptMediaBlob,
  decryptMediaBlob,
  getOpenAccessPassphrase
} from '../packages/crypto';

async function testCrossDeviceSimulation() {
  console.log('================================================================');
  console.log('   CROSS-DEVICE INSECURE CONTEXT (LAN HTTP) E2EE SIMULATION     ');
  console.log('================================================================\n');

  // Scenario 1: Host creates passwordless room on Desktop (with native crypto.subtle)
  console.log('[STEP 1] Host creates passwordless room on Desktop (Secure Context)');
  const roomId = 'test-room-cross-device';
  const openPassphrase = getOpenAccessPassphrase(roomId);

  // Host derives room keys
  const hostKeys = await deriveRoomKeys(openPassphrase);
  console.log('✓ Host derived Auth Commitment:', hostKeys.authCommitment.slice(0, 16) + '...');
  console.log('✓ Host salt:', hostKeys.salt);

  // Host creates RMS and wraps it with KWK
  const hostRMSBundle = await createAndWrapRoomSecret(hostKeys.keyWrappingKey);
  console.log('✓ Host created RMS & Wrapped RMS bundle');

  const nativeSubtle = (nodeCrypto.webcrypto as unknown as Crypto).subtle;

  // Helper functions to toggle subtle
  const disableSubtle = () => {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: undefined,
      configurable: true,
      writable: true
    });
  };

  const enableSubtle = () => {
    Object.defineProperty(globalThis.crypto, 'subtle', {
      value: nativeSubtle,
      configurable: true,
      writable: true
    });
  };

  // Scenario 2: Guest joins from Mobile Phone over LAN HTTP (Insecure Context: crypto.subtle is undefined)
  console.log('\n[STEP 2] Simulating Mobile Phone joining over LAN HTTP (window.crypto.subtle is UNDEFINED)');
  
  try {
    disableSubtle();
    console.log('   Active crypto.subtle on Mobile:', typeof globalThis.crypto.subtle);

    // Mobile derives room keys using the room salt
    const guestKeys = await deriveRoomKeys(openPassphrase, hostKeys.salt);
    console.log('✓ Mobile Guest derived Auth Commitment:', guestKeys.authCommitment.slice(0, 16) + '...');

    if (guestKeys.authCommitment !== hostKeys.authCommitment) {
      throw new Error(`Auth commitment mismatch between Host and Mobile Guest!\nHost: ${hostKeys.authCommitment}\nGuest: ${guestKeys.authCommitment}`);
    }
    console.log('✓ Auth Commitments MATCH 100%!');

    // Mobile Guest unwraps RMS using its KWK
    const guestRMS = await unwrapRoomSecret(guestKeys.keyWrappingKey, hostRMSBundle.wrappedBundle);
    console.log('✓ Mobile Guest successfully unwrapped Room Master Secret (RMS)');

    // Verify RMS bytes match exactly
    const hostRMSHex = Buffer.from(hostRMSBundle.roomMasterSecret).toString('hex');
    const guestRMSHex = Buffer.from(guestRMS).toString('hex');
    if (hostRMSHex !== guestRMSHex) {
      throw new Error('RMS mismatch between Host and Guest!');
    }
    console.log('✓ Host and Guest RMS are bit-for-bit IDENTICAL!');

    // Step 3: Host sends encrypted message to Mobile Guest
    console.log('\n[STEP 3] Host encrypts message -> Mobile Guest decrypts (without crypto.subtle)');
    
    // Enable subtle for Host sender key derivation and encryption
    enableSubtle();
    const hostSenderKey = await deriveEphemeralSessionKey(hostRMSBundle.roomMasterSecret, 'host-user-id');
    const hostPayload = await encryptMessage(
      hostSenderKey,
      'Welcome to ENCLAVE from Desktop Host!',
      roomId,
      'pkt-001',
      'host-user-id',
      1
    );

    // Disable subtle for Mobile Guest decryption
    disableSubtle();
    const guestReceiverKey = await deriveEphemeralSessionKey(guestRMS, 'host-user-id');
    const decryptedByGuest = await decryptMessage(
      guestReceiverKey,
      hostPayload,
      roomId,
      'pkt-001',
      'host-user-id'
    );
    console.log('✓ Mobile Guest successfully decrypted message:', decryptedByGuest);
    if (decryptedByGuest !== 'Welcome to ENCLAVE from Desktop Host!') {
      throw new Error('Decrypted message content mismatch!');
    }

    // Step 4: Mobile Guest sends encrypted response to Host
    console.log('\n[STEP 4] Mobile Guest encrypts message (without crypto.subtle) -> Host decrypts');
    const guestSenderKey = await deriveEphemeralSessionKey(guestRMS, 'mobile-user-id');
    const guestPayload = await encryptMessage(
      guestSenderKey,
      'Hello from Mobile Android phone over LAN HTTP!',
      roomId,
      'pkt-002',
      'mobile-user-id',
      1
    );

    // Enable subtle for Host decryption
    enableSubtle();
    const hostReceiverKey = await deriveEphemeralSessionKey(hostRMSBundle.roomMasterSecret, 'mobile-user-id');
    const decryptedByHost = await decryptMessage(
      hostReceiverKey,
      guestPayload,
      roomId,
      'pkt-002',
      'mobile-user-id'
    );
    console.log('✓ Desktop Host successfully decrypted message from Mobile:', decryptedByHost);
    if (decryptedByHost !== 'Hello from Mobile Android phone over LAN HTTP!') {
      throw new Error('Decrypted message content mismatch!');
    }

    // Step 5: Encrypted Media Transfer between Mobile and Host
    console.log('\n[STEP 5] Encrypted Media Blob Transfer between Mobile and Host');
    const testImageBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    
    // Mobile encrypts media (without subtle)
    disableSubtle();
    const encryptedMedia = await encryptMediaBlob(
      guestSenderKey,
      testImageBytes,
      roomId,
      'media-photo-001',
      'image/png'
    );

    // Host decrypts media (with subtle)
    enableSubtle();
    const decryptedMedia = await decryptMediaBlob(
      hostReceiverKey,
      encryptedMedia,
      roomId,
      'media-photo-001'
    );
    if (Buffer.from(decryptedMedia).toString('hex') !== Buffer.from(testImageBytes).toString('hex')) {
      throw new Error('Decrypted media bytes mismatch!');
    }
    console.log('✓ Media encryption and decryption verified across Desktop and Mobile!');

  } finally {
    enableSubtle();
  }

  console.log('\n================================================================');
  console.log('   CROSS-DEVICE INSECURE CONTEXT SIMULATION PASSED 100%!        ');
  console.log('================================================================');
}

testCrossDeviceSimulation().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
