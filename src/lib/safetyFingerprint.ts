/**
 * ENCLAVE Contact Identity Verification & Safety Fingerprint
 * Derives a deterministic 60-digit cryptographic safety fingerprint from the Room Master Secret
 * and sorted participant identities.
 * Compatible with Signal / Matrix verification standard (12 blocks of 5 digits).
 */

import { generateSecureId } from '@/packages/crypto';

export interface VerificationState {
  roomId: string;
  fingerprint: string;
  verifiedAt: number;
  isVerified: boolean;
}

const STORAGE_PREFIX = 'enclave_verified_contact_';

/**
 * Derives a 60-digit safety number from the shared room master secret and participant IDs.
 */
export async function deriveSafetyFingerprint(
  roomMasterSecret: Uint8Array,
  roomId: string,
  participantIds: string[]
): Promise<string> {
  const enc = new TextEncoder();
  const sortedIds = [...participantIds].sort().join(':');

  let subtle: SubtleCrypto | undefined;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    subtle = globalThis.crypto.subtle;
  } else {
    // Node.js fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('crypto');
      subtle = nodeCrypto.webcrypto?.subtle;
    } catch {}
  }

  if (!subtle) {
    throw new Error('SubtleCrypto is required for safety fingerprint derivation');
  }

  const rmsKeyMaterial = await subtle.importKey(
    'raw',
    roomMasterSecret as unknown as BufferSource,
    'HKDF',
    false,
    ['deriveBits']
  );

  const info = enc.encode(`ENCLAVE v1 | Safety Fingerprint | ${roomId} | ${sortedIds}`);
  const derivedBits = await subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode(`ENCLAVE_SALT:${roomId}`) as unknown as BufferSource,
      info: info as unknown as BufferSource
    },
    rmsKeyMaterial,
    256
  );

  const bytes = new Uint8Array(derivedBits);
  let digits = '';
  for (let i = 0; i < 12; i++) {
    const b0 = bytes[(i * 2) % bytes.length];
    const b1 = bytes[(i * 2 + 1) % bytes.length];
    const val = (b0 * 256 + b1) % 100000;
    digits += val.toString().padStart(5, '0');
  }

  return digits.match(/.{1,5}/g)?.join(' ') || digits;
}

/**
 * Creates QR code data payload for contact verification
 */
export function formatVerificationQrPayload(roomId: string, fingerprint: string): string {
  const compactDigits = fingerprint.replace(/\s+/g, '');
  return `enclave-verify:v1:${roomId}:${compactDigits}`;
}

/**
 * Parses and validates a scanned QR code payload
 */
export function parseVerificationQrPayload(payload: string): {
  valid: boolean;
  roomId?: string;
  fingerprint?: string;
  error?: string;
} {
  if (!payload || !payload.startsWith('enclave-verify:v1:')) {
    return { valid: false, error: 'Unrecognized QR code format. Not an ENCLAVE verification code.' };
  }

  const parts = payload.split(':');
  if (parts.length !== 4) {
    return { valid: false, error: 'Malformed verification code structure.' };
  }

  const roomId = parts[2];
  const compactDigits = parts[3];

  if (!/^\d{60}$/.test(compactDigits)) {
    return { valid: false, error: 'Invalid verification digits in QR code.' };
  }

  const formatted = compactDigits.match(/.{1,5}/g)?.join(' ') || compactDigits;
  return { valid: true, roomId, fingerprint: formatted };
}

/**
 * Retrieves persisted verification record for a room
 */
export function getStoredVerification(roomId: string): VerificationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persists verified identity
 */
export function storeVerifiedIdentity(roomId: string, fingerprint: string): void {
  if (typeof window === 'undefined') return;
  const state: VerificationState = {
    roomId,
    fingerprint,
    verifiedAt: Date.now(),
    isVerified: true
  };
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(state));
  } catch {}
}

/**
 * Clears verification state (e.g., if keys change or user resets)
 */
export function clearStoredVerification(roomId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${roomId}`);
  } catch {}
}
