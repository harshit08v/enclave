import { deriveRoomKeys, createAndWrapRoomSecret } from '../packages/crypto/index';

async function main() {
  const roomId = 'chamber-' + Math.random().toString(36).substring(2, 8);
  const keys = await deriveRoomKeys('vault-pass-secret-99');
  const { wrappedBundle } = await createAndWrapRoomSecret(keys.keyWrappingKey);
  const payload = {
    roomId,
    salt: keys.salt,
    authCommitment: keys.authCommitment,
    wrappedSecretBundle: wrappedBundle,
    requirePass: true,
    accessMode: 'with_pass'
  };

  console.log('Creating room on live deployment:', roomId);
  const res = await fetch('https://enclave.vercel.app/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Room creation response:', res.status, data);

  if (res.status === 200 || res.status === 201) {
    console.log(`ROOM_SUCCESS: https://enclave.vercel.app/r/${roomId}`);
  }
}

main().catch(console.error);
