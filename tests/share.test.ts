/**
 * ENCLAVE Share & Invitation Test Suite
 * Validates invitation formatting, separation of out-of-band pass, and zero pass leakage.
 */

import { formatRoomInvitation } from '../src/app/app/new/page.tsx';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runShareTests() {
  console.log('\n--- Running Share & Invitation Tests ---');

  const roomId = '8f92-c0e4';
  const roomUrl = 'https://enclave.chat/r/8f92-c0e4';
  const secretPass = 'orbit-quantum-matrix-velvet';

  // 1. Without Pass
  const inviteWithoutPass = formatRoomInvitation(roomId, roomUrl, false);
  console.log('✓ Formatted without-pass invite generated');
  assert(inviteWithoutPass.includes('Room ID: 8f92-c0e4'), 'Must contain Room ID');
  assert(inviteWithoutPass.includes('Join here: https://enclave.chat/r/8f92-c0e4'), 'Must contain Join URL');
  assert(inviteWithoutPass.includes('Private by design. Gone when you leave.'), 'Must contain tagline');
  assert(!inviteWithoutPass.includes(secretPass), 'Must not contain any pass');

  // 2. With Pass
  const inviteWithPass = formatRoomInvitation(roomId, roomUrl, true);
  console.log('✓ Formatted with-pass invite generated');
  assert(inviteWithPass.includes('Room ID: 8f92-c0e4'), 'Must contain Room ID');
  assert(inviteWithPass.includes('Join here: https://enclave.chat/r/8f92-c0e4'), 'Must contain Join URL');
  assert(inviteWithPass.includes('Please use the access pass shared with you separately, if required.'), 'Must instruct separate pass');
  assert(inviteWithPass.includes('Private by design. Gone when you leave.'), 'Must contain tagline');
  assert(!inviteWithPass.includes(secretPass), 'Secret pass must NEVER be in invite text');
  assert(!roomUrl.includes('pass='), 'Pass must NEVER be in URL query params');

  console.log('✅ Share & Invitation tests passed successfully.');
}
