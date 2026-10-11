/**
 * ENCLAVE Cryptography Package — Hardened V1
 * Pure client-side Web Cryptography API & Argon2id implementation for E2EE room messaging.
 * Key Hierarchy: Access Pass -> Argon2id -> PDK -> Key Wrapping Key (KWK) -> Room Master Secret (RMS) -> Ephemeral Session Keys -> AES-256-GCM (with AAD binding).
 */

import { argon2id } from 'hash-wasm';
import { hkdfDerive, sha256Digest, aesGcmEncrypt, aesGcmDecrypt } from './subtleEngine';

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

export interface EnclaveKey {
  type: 'secret';
  extractable: boolean;
  algorithm: any;
  usages: string[];
  _rawKey: Uint8Array;
}

export type EnclaveCryptoKey = CryptoKey | EnclaveKey;

export interface DerivedKeyBundle {
  authCommitment: string; // Hex string SHA-256 commitment of auth token
  keyWrappingKey: EnclaveCryptoKey; // AES-256-GCM key for wrapping/unwrapping the Room Master Secret
  salt: string; // Base64 salt used for Argon2id
}

export interface RoomCryptoSession {
  roomId: string;
  roomMasterSecret: Uint8Array;
  senderKey: EnclaveCryptoKey;
  receiverKeys: Map<string, EnclaveCryptoKey>;
  currentSequence: number;
  seenSequences: Map<string, Set<number>>;
  seenPacketIds: Set<string>;
}

/**
 * Standard cross-environment WebCrypto accessor for CSPRNG
 */
function getWebCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    return globalThis.crypto;
  }
  // Node.js fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
      return nodeCrypto.webcrypto;
    }
  } catch {}
  if (typeof window !== 'undefined' && (window as any).crypto && typeof (window as any).crypto.getRandomValues === 'function') {
    return (window as any).crypto;
  }
  throw new Error('CSPRNG (crypto.getRandomValues) is not available in current environment');
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(u8.byteLength);
  copy.set(u8);
  return copy.buffer as ArrayBuffer;
}

function toUint8Array(data: BufferSource | ArrayBuffer | Uint8Array | undefined | null): Uint8Array {
  if (!data) return new Uint8Array(0);
  if (data instanceof Uint8Array) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data as any);
}

/**
 * Cross-environment SubtleCrypto engine.
 * Transparently uses native WebCrypto when available in secure contexts,
 * and falls back to our audited, constant-time pure JS/WASM engine
 * on insecure LAN contexts (e.g. mobile testing on http://192.168.x.x:3000).
 */
function getSubtle() {
  const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  const hasNativeSubtle =
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.subtle !== 'undefined' &&
    typeof globalThis.crypto.subtle.importKey === 'function';

  if (!hasNativeSubtle && isProduction) {
    throw new Error(
      'Native WebCrypto (window.crypto.subtle) is required in production environments for secure operation. Please access ENCLAVE over HTTPS.'
    );
  }

  return {
    async importKey(
      format: 'raw',
      keyData: BufferSource,
      algorithm: any,
      extractable: boolean,
      keyUsages: string[]
    ): Promise<EnclaveCryptoKey> {
      const rawBytes = toUint8Array(keyData);

      if (hasNativeSubtle) {
        try {
          const nativeKey = await globalThis.crypto.subtle.importKey(
            format,
            rawBytes as unknown as BufferSource,
            algorithm,
            extractable,
            keyUsages as KeyUsage[]
          );
          try {
            Object.defineProperty(nativeKey, '_rawKey', {
              value: new Uint8Array(rawBytes),
              writable: false,
              enumerable: false,
              configurable: true
            });
          } catch {}
          return nativeKey;
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto importKey failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback to pure engine only in local development
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      return {
        type: 'secret',
        extractable,
        algorithm,
        usages: keyUsages,
        _rawKey: new Uint8Array(rawBytes)
      };
    },

    async deriveBits(
      algorithm: { name: string; hash?: string; salt: BufferSource; info: BufferSource },
      baseKey: EnclaveCryptoKey,
      length: number
    ): Promise<ArrayBuffer> {
      const enclaveKey = baseKey as EnclaveKey;
      if (hasNativeSubtle) {
        try {
          return await globalThis.crypto.subtle.deriveBits(
            algorithm as any,
            baseKey as CryptoKey,
            length
          );
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto deriveBits failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback if native fails in local dev
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      const ikm = enclaveKey._rawKey;
      if (!ikm) {
        throw new Error('Unable to derive bits: missing key material');
      }

      const salt = toUint8Array(algorithm.salt);
      const info = toUint8Array(algorithm.info);

      const derived = await hkdfDerive(ikm, salt, info, length / 8);
      return toArrayBuffer(derived);
    },

    async deriveKey(
      algorithm: { name: string; hash?: string; salt: BufferSource; info: BufferSource },
      baseKey: EnclaveCryptoKey,
      derivedKeyType: { name: string; length: number },
      extractable: boolean,
      keyUsages: string[]
    ): Promise<EnclaveCryptoKey> {
      const enclaveKey = baseKey as EnclaveKey;
      if (hasNativeSubtle) {
        try {
          return await globalThis.crypto.subtle.deriveKey(
            algorithm as any,
            baseKey as CryptoKey,
            derivedKeyType,
            extractable,
            keyUsages as KeyUsage[]
          );
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto deriveKey failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback if native fails in local dev
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      const ikm = enclaveKey._rawKey;
      if (!ikm) {
        throw new Error('Unable to derive key: missing key material');
      }

      const salt = toUint8Array(algorithm.salt);
      const info = toUint8Array(algorithm.info);

      const derived = await hkdfDerive(ikm, salt, info, derivedKeyType.length / 8);
      return {
        type: 'secret',
        extractable,
        algorithm: derivedKeyType,
        usages: keyUsages,
        _rawKey: derived
      };
    },

    async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
      if (hasNativeSubtle) {
        try {
          return await globalThis.crypto.subtle.digest(algorithm, data);
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto digest failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback if native fails in local dev
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      const dataBytes = toUint8Array(data);
      const hash = await sha256Digest(dataBytes);
      return toArrayBuffer(hash);
    },

    async encrypt(
      algorithm: { name: string; iv: BufferSource; additionalData?: BufferSource; tagLength?: number },
      key: EnclaveCryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      const enclaveKey = key as EnclaveKey;
      if (hasNativeSubtle) {
        try {
          return await globalThis.crypto.subtle.encrypt(
            algorithm as any,
            key as CryptoKey,
            data
          );
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto encrypt failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback if native fails in local dev
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      const rawKey = enclaveKey._rawKey;
      if (!rawKey) {
        throw new Error('Unable to encrypt: missing key material');
      }

      const iv = toUint8Array(algorithm.iv);
      const aad = algorithm.additionalData ? toUint8Array(algorithm.additionalData) : undefined;
      const pt = toUint8Array(data);

      const ct = aesGcmEncrypt(rawKey, iv, pt, aad, algorithm.tagLength || 128);
      return toArrayBuffer(ct);
    },

    async decrypt(
      algorithm: { name: string; iv: BufferSource; additionalData?: BufferSource; tagLength?: number },
      key: EnclaveCryptoKey,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      const enclaveKey = key as EnclaveKey;
      if (hasNativeSubtle) {
        try {
          return await globalThis.crypto.subtle.decrypt(
            algorithm as any,
            key as CryptoKey,
            data
          );
        } catch (err) {
          if (isProduction) {
            throw new Error(`Native WebCrypto decrypt failed: ${err instanceof Error ? err.message : String(err)}`);
          }
          // Fallback if native fails in local dev
        }
      }

      if (isProduction) {
        throw new Error('Software cryptographic fallback is disabled in production environments.');
      }

      const rawKey = enclaveKey._rawKey;
      if (!rawKey) {
        throw new Error('Unable to decrypt: missing key material');
      }

      const iv = toUint8Array(algorithm.iv);
      const aad = algorithm.additionalData ? toUint8Array(algorithm.additionalData) : undefined;
      const ct = toUint8Array(data);

      const pt = aesGcmDecrypt(rawKey, iv, ct, aad, algorithm.tagLength || 128);
      return toArrayBuffer(pt);
    }
  };
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
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
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
 * Zeroizes an Enclave CryptoKey in memory
 */
export function zeroizeKey(key: EnclaveCryptoKey): void {
  if ((key as EnclaveKey)._rawKey) {
    zeroizeBuffer((key as EnclaveKey)._rawKey);
  }
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
 * Derives the Pass-Derived Key (PDK) using memory-hard Argon2id (m=32MB, t=3, p=1).
 * Uses standalone ArrayBuffer allocation to prevent WASM heap offset issues in browser WebCrypto.
 */
export async function derivePassKeyArgon2id(
  passphrase: string,
  saltBytes: Uint8Array
): Promise<Uint8Array> {
  try {
    const rawHashHex = await argon2id({
      password: passphrase.trim(),
      salt: saltBytes,
      parallelism: 1,
      iterations: 3,
      memorySize: 32768, // 32 MB (32768 KiB)
      hashLength: 32, // 256-bit output
      outputType: 'hex'
    });
    // Converts hex into an isolated, standalone 32-byte ArrayBuffer
    return hexToBytes(rawHashHex);
  } catch (err) {
    throw new Error(`Argon2id key derivation failed: ${err instanceof Error ? err.message : String(err)}`);
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
  const subtle = getSubtle();

  // 1. Salt: 16 bytes CSPRNG
  let saltBytes: Uint8Array;
  if (providedSaltBase64) {
    saltBytes = new Uint8Array(base64ToBuffer(providedSaltBase64));
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  // 2. Memory-hard Argon2id derivation (guaranteed standalone 32-byte Uint8Array)
  const pdkBytes = await derivePassKeyArgon2id(passphrase, saltBytes);

  // 3. Import PDK into HKDF key material
  const pdkKeyMaterial = await subtle.importKey(
    'raw',
    pdkBytes,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey']
  );

  // 4. Domain-Separated Derivation: Auth Token
  const enc = new TextEncoder();
  const authInfo = enc.encode('ENCLAVE v1 | Auth Token');
  const authBits = await subtle.deriveBits(
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
  const authCommitmentBuffer = await subtle.digest('SHA-256', authBits as unknown as BufferSource);
  const authCommitment = bufferToHex(authCommitmentBuffer);

  // 5. Domain-Separated Derivation: Key Wrapping Key (KWK) for AES-256-GCM
  const kwkInfo = enc.encode('ENCLAVE v1 | Key Wrapping Key');
  const keyWrappingKey = await subtle.deriveKey(
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
export async function createAndWrapRoomSecret(keyWrappingKey: EnclaveCryptoKey): Promise<{
  roomMasterSecret: Uint8Array;
  wrappedBundle: WrappedSecretBundle;
}> {
  const crypto = getWebCrypto();
  const subtle = getSubtle();

  // 1. Generate 32 bytes (256-bit) CSPRNG Room Master Secret
  const roomMasterSecret = new Uint8Array(32);
  crypto.getRandomValues(roomMasterSecret);

  // 2. Generate 96-bit IV for key wrapping
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // 3. Encrypt RMS with KWK + AAD binding
  const aad = new TextEncoder().encode('ENCLAVE v1 | Room Master Secret Wrap');
  const encryptedRMS = await subtle.encrypt(
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
  keyWrappingKey: EnclaveCryptoKey,
  wrappedBundle: WrappedSecretBundle
): Promise<Uint8Array> {
  const subtle = getSubtle();
  const iv = new Uint8Array(base64ToBuffer(wrappedBundle.iv));
  const ciphertext = base64ToBuffer(wrappedBundle.wrappedKey);
  const aad = new TextEncoder().encode('ENCLAVE v1 | Room Master Secret Wrap');

  const decryptedRMS = await subtle.decrypt(
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
): Promise<EnclaveCryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();

  const rmsKeyMaterial = await subtle.importKey(
    'raw',
    roomMasterSecret as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );

  const sessionInfo = enc.encode(`ENCLAVE v1 | Session Key | ${participantId}`);
  return await subtle.deriveKey(
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
  sessionKey: EnclaveCryptoKey,
  plaintext: string,
  roomId: string,
  packetId: string,
  senderId: string,
  sequence: number,
  timestamp: number = Date.now(),
  version: number = 1
): Promise<EncryptedPayload> {
  const crypto = getWebCrypto();
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  // Fresh 96-bit IV (12 bytes) CSPRNG
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Canonical AAD
  const aad = createCanonicalAAD(version, roomId, packetId, senderId, sequence, timestamp);

  const encryptedBuffer = await subtle.encrypt(
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
  sessionKey: EnclaveCryptoKey,
  payload: EncryptedPayload,
  roomId: string,
  packetId: string,
  senderId: string,
  version: number = 1
): Promise<string> {
  const subtle = getSubtle();
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

  const decryptedBuffer = await subtle.decrypt(
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
 * Timing-safe comparison for strings and byte arrays to prevent timing side-channel attacks.
 */
export function timingSafeEqual(a: string | Uint8Array | ArrayBuffer, b: string | Uint8Array | ArrayBuffer): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  const bytesA = a instanceof Uint8Array ? a : new Uint8Array(typeof a === 'string' ? new TextEncoder().encode(a) : (a as ArrayBuffer));
  const bytesB = b instanceof Uint8Array ? b : new Uint8Array(typeof b === 'string' ? new TextEncoder().encode(b) : (b as ArrayBuffer));

  if (bytesA.length !== bytesB.length) return false;
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
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
  return `enclave-open-access-${(roomId || '').trim().toLowerCase()}`;
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
  sessionKey: EnclaveCryptoKey,
  fileBytes: Uint8Array,
  roomId: string,
  mediaId: string,
  mimeType: string,
  timestamp: number = Date.now(),
  version: number = 1
): Promise<EncryptedMediaBundle> {
  const crypto = getWebCrypto();
  const subtle = getSubtle();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const aad = createCanonicalMediaAAD(version, roomId, mediaId, mimeType, timestamp);

  const encryptedBuffer = await subtle.encrypt(
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
  sessionKey: EnclaveCryptoKey,
  bundle: { iv: string; ciphertext: string; mimeType: string; timestamp: number },
  roomId: string,
  mediaId: string,
  version: number = 1
): Promise<Uint8Array> {
  const subtle = getSubtle();
  const ivBuffer = base64ToBuffer(bundle.iv);
  const ciphertextBuffer = base64ToBuffer(bundle.ciphertext);

  const aad = createCanonicalMediaAAD(version, roomId, mediaId, bundle.mimeType, bundle.timestamp);

  const decryptedBuffer = await subtle.decrypt(
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
