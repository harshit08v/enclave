/**
 * ENCLAVE Cryptography Package — Hardened V1
 * Pure client-side Web Cryptography API & Argon2id implementation for E2EE room messaging.
 * Key Hierarchy: Access Pass -> Argon2id -> PDK -> Key Wrapping Key (KWK) -> Room Master Secret (RMS) -> Ephemeral Session Keys -> AES-256-GCM (with AAD binding).
 */

import { argon2id } from 'hash-wasm';

export interface EncryptedPayload {
  iv: string; // Base64 96-bit (12 bytes) CSPRNG nonce
  ciphertext: string; // Base64 ciphertext with appended 128-bit authentication tag
  sequence: number; // Monotonic sequence counter
  timestamp: number; // Message creation timestamp (ms)
}

export interface WrappedSecretBundle {
  wrappedKey: string; // Base64 encrypted Room Master Secret
  iv: string; // Base64 96-bit IV used for key wrapping
}

export interface DerivedKeyBundle {
  authCommitment: string; // Hex string SHA-256 commitment of auth token
  keyWrappingKey: CryptoKey; // AES-256-GCM key for wrapping/unwrapping the Room Master Secret
  salt: string; // Base64 salt used for Argon2id
}

export interface RoomCryptoSession {
  roomId: string;
  roomMasterSecret: Uint8Array;
  senderKey: CryptoKey;
  receiverKeys: Map<string, CryptoKey>;
  currentSequence: number;
  seenSequences: Map<string, Set<number>>;
  seenPacketIds: Set<string>;
}

/**
 * Standard cross-environment WebCrypto accessor
 */
function getWebCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('WebCrypto API is not available in current environment');
}

/**
 * High-entropy Diceware wordlist for human-friendly, high-security passphrases.
 */
const WORDLIST = [
  'monolith', 'chamber', 'silence', 'perimeter', 'zenith', 'obsidian',
  'cipher', 'bastion', 'sanctum', 'lattice', 'citadel', 'vector',
  'aperture', 'vertex', 'quantum', 'spectral', 'solitude', 'granite',
  'meridian', 'valkyrie', 'stratum', 'arcadia', 'parapet', 'elysium',
  'solace', 'vortex', 'tesseract', 'bastille', 'aurora', 'eclipse',
  'prism', 'cascade', 'terminus', 'beacon', 'conduit', 'sentinel'
];

/**
 * Generates a cryptographically secure random 4-word Diceware passphrase.
 * NEVER uses Math.random().
 */
export function generateDicewarePassphrase(): string {
  const crypto = getWebCrypto();
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map(val => WORDLIST[val % WORDLIST.length])
    .join('-');
}

/**
 * Generates an unpredictable CSPRNG alphanumeric secure key.
 */
export function generateAlphanumericKey(length = 16): string {
  const crypto = getWebCrypto();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map(v => chars[v % chars.length])
    .join('')
    .replace(/(.{4})/g, '$1-')
    .slice(0, length + Math.floor((length - 1) / 4));
}

/**
 * Generates a cryptographically secure random ID (e.g. for rooms or packets).
 */
export function generateSecureId(prefix = '', byteLength = 8): string {
  const crypto = getWebCrypto();
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Converts ArrayBuffer / Uint8Array to Base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to ArrayBuffer
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts ArrayBuffer to Hex string
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts Hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Securely overwrites a Uint8Array with random noise before zeroing out.
 */
export function zeroizeBuffer(buffer: Uint8Array): void {
  const crypto = getWebCrypto();
  crypto.getRandomValues(buffer);
  buffer.fill(0);
}

/**
 * Generates Canonical Authenticated Associated Data (AAD) bytes.
 * Binds version, roomId, packetId, senderId, sequence, and timestamp.
 */
export function createCanonicalAAD(
  version: number,
  roomId: string,
  packetId: string,
  senderId: string,
  sequence: number,
  timestamp: number
): Uint8Array {
  const aadString = `ENCLAVE-v${version}|ROOM:${roomId}|PKT:${packetId}|SENDER:${senderId}|SEQ:${sequence}|TS:${timestamp}`;
  return new TextEncoder().encode(aadString);
}

/**
 * Derives the Pass-Derived Key (PDK) using memory-hard Argon2id (m=64MB, t=3, p=4).
 * Falls back to audited PBKDF2-SHA256 (600,000 iterations) if WASM is unavailable.
 */
export async function derivePassKeyArgon2id(
  passphrase: string,
  saltBytes: Uint8Array
): Promise<Uint8Array> {
  try {
    const rawHashHex = await argon2id({
      password: passphrase.trim(),
      salt: saltBytes,
      parallelism: 4,
      iterations: 3,
      memorySize: 65536, // 64 MB
      hashLength: 32, // 256-bit output
      outputType: 'hex'
    });
    return hexToBytes(rawHashHex);
  } catch (err) {
    // Fallback: PBKDF2-SHA256 with 600,000 rounds
    const crypto = getWebCrypto();
    const enc = new TextEncoder();
    const passKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase.trim()),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes as unknown as BufferSource,
        iterations: 600000,
        hash: 'SHA-256'
      },
      passKey,
      256
    );
    return new Uint8Array(bits);
  }
}

/**
 * Derives both the Server Authorization Commitment (HMAC-SHA256) and the Key Wrapping Key (KWK)
 * from the out-of-band Access Passphrase using Argon2id and HKDF domain separation.
 */
export async function deriveRoomKeys(
  passphrase: string,
  providedSaltBase64?: string
): Promise<DerivedKeyBundle> {
  const crypto = getWebCrypto();

  // 1. Salt: 16 bytes CSPRNG
  let saltBytes: Uint8Array;
  if (providedSaltBase64) {
    saltBytes = new Uint8Array(base64ToBuffer(providedSaltBase64));
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  // 2. Memory-hard Argon2id derivation
  const pdkBytes = await derivePassKeyArgon2id(passphrase, saltBytes);

  // 3. Import PDK into WebCrypto HKDF key material
  const pdkKeyMaterial = await crypto.subtle.importKey(
    'raw',
    pdkBytes as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 4. Domain-Separated Derivation: Auth Token
  const enc = new TextEncoder();
  const authInfo = enc.encode('ENCLAVE v1 | Auth Token');
  const authBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32) as unknown as BufferSource,
      info: authInfo as unknown as BufferSource
    },
    pdkKeyMaterial,
    256
  );

  // One-way SHA-256 commitment of the auth token (sent to server, zero plaintext pass transmitted)
  const authCommitmentBuffer = await crypto.subtle.digest('SHA-256', authBits as unknown as BufferSource);
  const authCommitment = bufferToHex(authCommitmentBuffer);

  // 5. Domain-Separated Derivation: Key Wrapping Key (KWK) for AES-256-GCM
  const kwkInfo = enc.encode('ENCLAVE v1 | Key Wrapping Key');
  const keyWrappingKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32) as unknown as BufferSource,
      info: kwkInfo as unknown as BufferSource
    },
    pdkKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  // Zeroize intermediate memory buffers
  zeroizeBuffer(pdkBytes);

  return {
    authCommitment,
    keyWrappingKey,
    salt: bufferToBase64(saltBytes.buffer as ArrayBuffer)
  };
}

/**
 * Generates an independent 256-bit CSPRNG Room Master Secret (RMS) and wraps it with the KWK.
 */
export async function createAndWrapRoomSecret(keyWrappingKey: CryptoKey): Promise<{
  roomMasterSecret: Uint8Array;
  wrappedBundle: WrappedSecretBundle;
}> {
  const crypto = getWebCrypto();

  // 1. Generate 32 bytes (256-bit) CSPRNG Room Master Secret
  const roomMasterSecret = new Uint8Array(32);
  crypto.getRandomValues(roomMasterSecret);

  // 2. Generate 96-bit IV for key wrapping
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // 3. Encrypt RMS with KWK + AAD binding
  const aad = new TextEncoder().encode('ENCLAVE v1 | Room Master Secret Wrap');
  const encryptedRMS = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    keyWrappingKey,
    roomMasterSecret as unknown as BufferSource
  );

  return {
    roomMasterSecret,
    wrappedBundle: {
      wrappedKey: bufferToBase64(encryptedRMS),
      iv: bufferToBase64(iv.buffer as ArrayBuffer)
    }
  };
}

/**
 * Unwraps the 256-bit Room Master Secret using the recipient's KWK.
 */
export async function unwrapRoomSecret(
  keyWrappingKey: CryptoKey,
  wrappedBundle: WrappedSecretBundle
): Promise<Uint8Array> {
  const crypto = getWebCrypto();
  const iv = new Uint8Array(base64ToBuffer(wrappedBundle.iv));
  const ciphertext = base64ToBuffer(wrappedBundle.wrappedKey);
  const aad = new TextEncoder().encode('ENCLAVE v1 | Room Master Secret Wrap');

  const decryptedRMS = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    keyWrappingKey,
    ciphertext
  );

  return new Uint8Array(decryptedRMS);
}

/**
 * Derives an ephemeral directional AES-256-GCM session key from the Room Master Secret (RMS).
 */
export async function deriveEphemeralSessionKey(
  roomMasterSecret: Uint8Array,
  participantId: string
): Promise<CryptoKey> {
  const crypto = getWebCrypto();
  const enc = new TextEncoder();

  const rmsKeyMaterial = await crypto.subtle.importKey(
    'raw',
    roomMasterSecret as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );

  const sessionInfo = enc.encode(`ENCLAVE v1 | Session Key | ${participantId}`);
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32) as unknown as BufferSource,
      info: sessionInfo as unknown as BufferSource
    },
    rmsKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string with AES-256-GCM using a freshly generated 96-bit IV and Canonical AAD.
 */
export async function encryptMessage(
  sessionKey: CryptoKey,
  plaintext: string,
  roomId: string,
  packetId: string,
  senderId: string,
  sequence: number,
  timestamp: number = Date.now(),
  version: number = 1
): Promise<EncryptedPayload> {
  const crypto = getWebCrypto();
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  // Fresh 96-bit IV (12 bytes) CSPRNG
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Canonical AAD
  const aad = createCanonicalAAD(version, roomId, packetId, senderId, sequence, timestamp);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    sessionKey,
    plaintextBytes
  );

  return {
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    ciphertext: bufferToBase64(encryptedBuffer),
    sequence,
    timestamp
  };
}

/**
 * Decrypts an AES-256-GCM ciphertext payload with the supplied CryptoKey and verifies Canonical AAD.
 */
export async function decryptMessage(
  sessionKey: CryptoKey,
  payload: EncryptedPayload,
  roomId: string,
  packetId: string,
  senderId: string,
  version: number = 1
): Promise<string> {
  const crypto = getWebCrypto();
  const ivBuffer = base64ToBuffer(payload.iv);
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

  // Reconstruct exact Canonical AAD
  const aad = createCanonicalAAD(
    version,
    roomId,
    packetId,
    senderId,
    payload.sequence,
    payload.timestamp
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer) as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    sessionKey,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Timing-safe string comparison to prevent timing side-channel attacks on tokens.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verification utility to ensure URLs never contain passphrases or sensitive tokens.
 */
export function sanitizeRoomUrl(urlOrPath: string): string {
  try {
    const url = new URL(urlOrPath, 'https://enclave.app');
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return urlOrPath.split('?')[0].split('#')[0];
  }
}

/**
 * Generates deterministic key derivation seed for open link-access rooms.
 */
export function getOpenAccessPassphrase(roomId: string): string {
  return `enclave-open-access-${roomId}`;
}

export interface EncryptedMediaBundle {
  mediaId: string;
  iv: string; // Base64 96-bit IV
  ciphertext: string; // Base64 ciphertext with appended auth tag
  mimeType: string;
  size: number;
  timestamp: number;
}

export function createCanonicalMediaAAD(
  version: number,
  roomId: string,
  mediaId: string,
  mimeType: string,
  timestamp: number
): Uint8Array {
  const aadString = `ENCLAVE-MEDIA-v${version}|ROOM:${roomId}|MEDIA:${mediaId}|MIME:${mimeType}|TS:${timestamp}`;
  return new TextEncoder().encode(aadString);
}

/**
 * Encrypts raw media bytes locally using AES-256-GCM and Canonical Media AAD binding.
 */
export async function encryptMediaBlob(
  sessionKey: CryptoKey,
  fileBytes: Uint8Array,
  roomId: string,
  mediaId: string,
  mimeType: string,
  timestamp: number = Date.now(),
  version: number = 1
): Promise<EncryptedMediaBundle> {
  const crypto = getWebCrypto();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const aad = createCanonicalMediaAAD(version, roomId, mediaId, mimeType, timestamp);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    sessionKey,
    fileBytes as unknown as BufferSource
  );

  return {
    mediaId,
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuffer),
    mimeType,
    size: fileBytes.byteLength,
    timestamp
  };
}

/**
 * Decrypts AES-256-GCM encrypted media bytes locally and verifies Canonical Media AAD.
 */
export async function decryptMediaBlob(
  sessionKey: CryptoKey,
  bundle: { iv: string; ciphertext: string; mimeType: string; timestamp: number },
  roomId: string,
  mediaId: string,
  version: number = 1
): Promise<Uint8Array> {
  const crypto = getWebCrypto();
  const ivBuffer = base64ToBuffer(bundle.iv);
  const ciphertextBuffer = base64ToBuffer(bundle.ciphertext);

  const aad = createCanonicalMediaAAD(version, roomId, mediaId, bundle.mimeType, bundle.timestamp);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer) as unknown as BufferSource,
      additionalData: aad as unknown as BufferSource,
      tagLength: 128
    },
    sessionKey,
    ciphertextBuffer
  );

  return new Uint8Array(decryptedBuffer);
}

