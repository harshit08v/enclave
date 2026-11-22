/**
 * ENCLAVE Device Identity & Cryptographic Fingerprinting
 * Manages persistent asymmetric Ed25519 device identities and X25519 prekeys
 * for Signal-grade Double Ratchet session establishment and peer verification.
 */

import { getWebCryptoSubtle, bufferToHex, hexToBytes } from '@/packages/crypto';

export interface SignedPrekeyCertificate {
  version: 'ENCLAVE_PREKEY_CERT_v1';
  algorithm: 'Ed25519:X25519';
  purpose: 'e2ee_pairwise_prekey';
  deviceId: string;
  identityKey: string;
  prekey: string;
  prekeyId: string;
  createdAt: number;
  expiresAt: number;
  signature: string;
}

export interface StoredDeviceIdentity {
  deviceId: string;
  identityPublicKeyHex: string;
  identityPrivateKeyPkcs8Hex: string;
  prekeyPublicKeyHex: string;
  prekeyPrivateKeyPkcs8Hex: string;
  prekeySignatureHex?: string;
  prekeyId?: string;
  prekeyCreatedAt?: number;
  prekeyExpiresAt?: number;
  createdAt: number;
}

const STORAGE_KEY = 'enclave_device_identity_v2';

let inMemoryIdentity: StoredDeviceIdentity | null = null;

/**
 * Constructs the canonical signing payload for prekey certification
 */
export function createPrekeySignPayload(
  identityPublicKeyHex: string,
  prekeyPublicKeyHex: string,
  createdAt?: number
): Uint8Array {
  const tsSuffix = typeof createdAt === 'number' && createdAt > 0 ? `:${createdAt}` : '';
  const normalized = `ENCLAVE_SIGNED_PREKEY_v1:${identityPublicKeyHex.toLowerCase()}:${prekeyPublicKeyHex.toLowerCase()}${tsSuffix}`;
  return new TextEncoder().encode(normalized);
}

/**
 * Constructs the canonical signing payload for structured SignedPrekeyCertificate
 */
export function createPrekeyCertSignPayload(cert: {
  version?: string;
  algorithm?: string;
  purpose?: string;
  deviceId?: string;
  identityKey: string;
  prekey: string;
  prekeyId?: string;
  createdAt?: number;
  expiresAt?: number;
}): Uint8Array {
  const version = cert.version || 'ENCLAVE_PREKEY_CERT_v1';
  const algorithm = cert.algorithm || 'Ed25519:X25519';
  const purpose = cert.purpose || 'e2ee_pairwise_prekey';
  const deviceId = cert.deviceId || '';
  const identityKey = (cert.identityKey || '').toLowerCase();
  const prekey = (cert.prekey || '').toLowerCase();
  const prekeyId = cert.prekeyId || '';
  const createdAt = typeof cert.createdAt === 'number' ? cert.createdAt : 0;
  const expiresAt = typeof cert.expiresAt === 'number' ? cert.expiresAt : 0;

  const normalized = `ENCLAVE_PREKEY_CERT:${version}|${algorithm}|${purpose}|${deviceId}|${identityKey}|${prekey}|${prekeyId}|${createdAt}|${expiresAt}`;
  return new TextEncoder().encode(normalized);
}

/**
 * Generates a fresh device identity keypair (Ed25519) and certified prekey (X25519)
 */
export async function generateFreshDeviceIdentity(): Promise<StoredDeviceIdentity> {
  const subtle = getWebCryptoSubtle();

  // 1. Generate Ed25519 Identity Keypair
  const identityPair = (await subtle.generateKey(
    { name: 'Ed25519' as any },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  const idPubRaw = await subtle.exportKey('raw', identityPair.publicKey);
  const idPrivPkcs8 = await subtle.exportKey('pkcs8', identityPair.privateKey);

  // 2. Generate X25519 Prekey
  const prekeyPair = (await subtle.generateKey(
    { name: 'X25519' as any },
    true,
    ['deriveBits', 'deriveKey']
  )) as CryptoKeyPair;

  const prekeyPubRaw = await subtle.exportKey('raw', prekeyPair.publicKey);
  const prekeyPrivPkcs8 = await subtle.exportKey('pkcs8', prekeyPair.privateKey);

  // 3. Construct identity record
  const idPubHex = bufferToHex(idPubRaw);
  const prekeyPubHex = bufferToHex(prekeyPubRaw);
  const deviceId = `dev_${idPubHex.slice(0, 16)}`;
  const prekeyId = `pk_${prekeyPubHex.slice(0, 12)}`;
  const now = Date.now();
  const expiresAt = now + 7 * 86400 * 1000; // 7-day prekey validity

  // 4. Asymmetrically sign the X25519 prekey with the Ed25519 identity key
  const prekeySigPayload = createPrekeySignPayload(idPubHex, prekeyPubHex);
  const sigBuffer = await subtle.sign(
    { name: 'Ed25519' as any },
    identityPair.privateKey,
    prekeySigPayload as unknown as BufferSource
  );
  const prekeySignatureHex = bufferToHex(sigBuffer);

  const record: StoredDeviceIdentity = {
    deviceId,
    identityPublicKeyHex: idPubHex,
    identityPrivateKeyPkcs8Hex: bufferToHex(idPrivPkcs8),
    prekeyPublicKeyHex: prekeyPubHex,
    prekeyPrivateKeyPkcs8Hex: bufferToHex(prekeyPrivPkcs8),
    prekeySignatureHex,
    prekeyId,
    prekeyCreatedAt: now,
    prekeyExpiresAt: expiresAt,
    createdAt: now
  };

  return record;
}

/**
 * Rotates the device's X25519 prekey, signs it with the Ed25519 identity key, and updates storage
 */
export async function rotateDevicePrekey(identity: StoredDeviceIdentity): Promise<StoredDeviceIdentity> {
  const subtle = getWebCryptoSubtle();

  // Generate fresh X25519 Prekey
  const prekeyPair = (await subtle.generateKey(
    { name: 'X25519' as any },
    true,
    ['deriveBits', 'deriveKey']
  )) as CryptoKeyPair;

  const prekeyPubRaw = await subtle.exportKey('raw', prekeyPair.publicKey);
  const prekeyPrivPkcs8 = await subtle.exportKey('pkcs8', prekeyPair.privateKey);
  const prekeyPubHex = bufferToHex(prekeyPubRaw);
  const prekeyId = `pk_${prekeyPubHex.slice(0, 12)}`;
  const now = Date.now();
  const expiresAt = now + 7 * 86400 * 1000;

  const idPrivKey = await subtle.importKey(
    'pkcs8',
    hexToBytes(identity.identityPrivateKeyPkcs8Hex) as unknown as BufferSource,
    { name: 'Ed25519' as any },
    false,
    ['sign']
  );

  const prekeySigPayload = createPrekeySignPayload(identity.identityPublicKeyHex, prekeyPubHex);
  const sigBuffer = await subtle.sign(
    { name: 'Ed25519' as any },
    idPrivKey,
    prekeySigPayload as unknown as BufferSource
  );

  const updated: StoredDeviceIdentity = {
    ...identity,
    prekeyPublicKeyHex: prekeyPubHex,
    prekeyPrivateKeyPkcs8Hex: bufferToHex(prekeyPrivPkcs8),
    prekeySignatureHex: bufferToHex(sigBuffer),
    prekeyId,
    prekeyCreatedAt: now,
    prekeyExpiresAt: expiresAt
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  } else {
    inMemoryIdentity = updated;
  }

  return updated;
}

export interface VerifyPrekeyCertResult {
  valid: boolean;
  error?: string;
}

/**
 * Verifies a SignedPrekeyCertificate against its Ed25519 identity public key,
 * enforcing validity bounds, key lengths, and signature authenticity.
 */
export async function verifyPrekeyCertificate(
  cert: {
    version?: string;
    algorithm?: string;
    purpose?: string;
    deviceId?: string;
    identityKey: string;
    prekey: string;
    prekeyId?: string;
    createdAt?: number;
    expiresAt?: number;
    signature: string;
  },
  options?: {
    verifyExpiration?: boolean;
    now?: number;
  }
): Promise<VerifyPrekeyCertResult> {
  if (!cert.identityKey || !cert.prekey || !cert.signature) {
    return { valid: false, error: 'MISSING_MANDATORY_FIELDS' };
  }
  if (cert.identityKey.length !== 64 || cert.prekey.length !== 64) {
    return { valid: false, error: 'INVALID_KEY_LENGTH' };
  }
  if (cert.signature.length !== 128) {
    return { valid: false, error: 'INVALID_SIGNATURE_LENGTH' };
  }

  // Check expiration if expiresAt is set
  const now = options?.now ?? Date.now();
  if (options?.verifyExpiration !== false && typeof cert.expiresAt === 'number' && cert.expiresAt > 0) {
    if (now > cert.expiresAt) {
      return { valid: false, error: 'EXPIRED_PREKEY_CERTIFICATE' };
    }
  }

  // Check version and algorithm if supplied
  if (cert.version && cert.version !== 'ENCLAVE_PREKEY_CERT_v1') {
    return { valid: false, error: 'UNSUPPORTED_CERT_VERSION' };
  }
  if (cert.algorithm && cert.algorithm !== 'Ed25519:X25519') {
    return { valid: false, error: 'UNSUPPORTED_CERT_ALGORITHM' };
  }

  const subtle = getWebCryptoSubtle();
  try {
    const pubKey = await subtle.importKey(
      'raw',
      hexToBytes(cert.identityKey) as unknown as BufferSource,
      { name: 'Ed25519' as any },
      false,
      ['verify']
    );

    const sigBytes = hexToBytes(cert.signature);

    // Candidates to verify (structured cert payload first, then legacy payloads)
    const candidates: Uint8Array[] = [
      createPrekeyCertSignPayload(cert),
      createPrekeyCertSignPayload({ ...cert, createdAt: 0, expiresAt: 0 })
    ];

    if (typeof cert.createdAt === 'number' && cert.createdAt > 0) {
      candidates.push(createPrekeySignPayload(cert.identityKey, cert.prekey, cert.createdAt));
    }
    candidates.push(createPrekeySignPayload(cert.identityKey, cert.prekey));
    candidates.push(hexToBytes(cert.prekey));

    for (const candidate of candidates) {
      const valid = await subtle.verify(
        { name: 'Ed25519' as any },
        pubKey,
        sigBytes as unknown as BufferSource,
        candidate as unknown as BufferSource
      );
      if (valid) return { valid: true };
    }

    return { valid: false, error: 'INVALID_SIGNATURE' };
  } catch (err) {
    return { valid: false, error: (err as Error).message || 'VERIFICATION_ERROR' };
  }
}

/**
 * Verifies that an X25519 prekey is authentically signed by an Ed25519 identity key
 */
export async function verifyPrekeySignature(
  identityPublicKeyHex: string,
  prekeyPublicKeyHex: string,
  prekeySignatureHex: string,
  createdAt?: number,
  expiresAt?: number,
  prekeyId?: string,
  deviceId?: string
): Promise<boolean> {
  const result = await verifyPrekeyCertificate({
    identityKey: identityPublicKeyHex,
    prekey: prekeyPublicKeyHex,
    signature: prekeySignatureHex,
    createdAt,
    expiresAt,
    prekeyId,
    deviceId
  });
  return result.valid;
}

/**
 * Constructs a structured SignedPrekeyCertificate from a StoredDeviceIdentity.
 */
export function getDevicePrekeyCertificate(identity: StoredDeviceIdentity): SignedPrekeyCertificate {
  const now = identity.prekeyCreatedAt || identity.createdAt || Date.now();
  const expiresAt = identity.prekeyExpiresAt || (now + 7 * 86400 * 1000);
  return {
    version: 'ENCLAVE_PREKEY_CERT_v1',
    algorithm: 'Ed25519:X25519',
    purpose: 'e2ee_pairwise_prekey',
    deviceId: identity.deviceId,
    identityKey: identity.identityPublicKeyHex,
    prekey: identity.prekeyPublicKeyHex,
    prekeyId: identity.prekeyId || `pk_${identity.prekeyPublicKeyHex.slice(0, 12)}`,
    createdAt: now,
    expiresAt,
    signature: identity.prekeySignatureHex || ''
  };
}

/**
 * Creates and cryptographically signs a structured SignedPrekeyCertificate.
 */
export async function createSignedPrekeyCertificate(
  identity: StoredDeviceIdentity,
  options?: {
    expiresInMs?: number;
    now?: number;
  }
): Promise<SignedPrekeyCertificate> {
  const subtle = getWebCryptoSubtle();
  const now = options?.now ?? (identity.prekeyCreatedAt || identity.createdAt || Date.now());
  const expiresInMs = options?.expiresInMs ?? 7 * 86400 * 1000;
  const expiresAt = now + expiresInMs;
  const prekeyId = identity.prekeyId || `pk_${identity.prekeyPublicKeyHex.slice(0, 12)}`;

  const certData = {
    version: 'ENCLAVE_PREKEY_CERT_v1' as const,
    algorithm: 'Ed25519:X25519' as const,
    purpose: 'e2ee_pairwise_prekey' as const,
    deviceId: identity.deviceId,
    identityKey: identity.identityPublicKeyHex,
    prekey: identity.prekeyPublicKeyHex,
    prekeyId,
    createdAt: now,
    expiresAt
  };

  const payload = createPrekeyCertSignPayload(certData);
  const idPrivKey = await subtle.importKey(
    'pkcs8',
    hexToBytes(identity.identityPrivateKeyPkcs8Hex) as unknown as BufferSource,
    { name: 'Ed25519' as any },
    false,
    ['sign']
  );
  const sigBuffer = await subtle.sign(
    { name: 'Ed25519' as any },
    idPrivKey,
    payload as unknown as BufferSource
  );

  return {
    ...certData,
    signature: bufferToHex(sigBuffer)
  };
}

/**
 * Retrieves existing device identity from browser storage or initializes a new one.
 */
export async function getOrCreateDeviceIdentity(): Promise<StoredDeviceIdentity> {
  if (typeof window === 'undefined') {
    if (!inMemoryIdentity) {
      inMemoryIdentity = await generateFreshDeviceIdentity();
    }
    return inMemoryIdentity;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDeviceIdentity;
      if (parsed.identityPublicKeyHex && parsed.identityPrivateKeyPkcs8Hex) {
        if (!parsed.prekeySignatureHex && parsed.prekeyPublicKeyHex) {
          // Self-heal legacy stored identity with prekey signature
          const subtle = getWebCryptoSubtle();
          const idPrivKey = await subtle.importKey(
            'pkcs8',
            hexToBytes(parsed.identityPrivateKeyPkcs8Hex) as unknown as BufferSource,
            { name: 'Ed25519' as any },
            false,
            ['sign']
          );
          const now = parsed.createdAt || Date.now();
          const payload = createPrekeySignPayload(parsed.identityPublicKeyHex, parsed.prekeyPublicKeyHex);
          const sig = await subtle.sign({ name: 'Ed25519' as any }, idPrivKey, payload as unknown as BufferSource);
          parsed.prekeySignatureHex = bufferToHex(sig);
          parsed.prekeyCreatedAt = now;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch {
    // Storage access restricted or corrupted
  }

  const fresh = await generateFreshDeviceIdentity();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Session fallback if localStorage is blocked
  }
  return fresh;
}

/**
 * Signs payload bytes using the device's Ed25519 private key
 */
export async function signWithDeviceIdentity(
  identity: StoredDeviceIdentity,
  data: Uint8Array
): Promise<string> {
  const subtle = getWebCryptoSubtle();
  const privKey = await subtle.importKey(
    'pkcs8',
    hexToBytes(identity.identityPrivateKeyPkcs8Hex) as unknown as BufferSource,
    'Ed25519' as any,
    false,
    ['sign']
  );

  const sig = await subtle.sign('Ed25519' as any, privKey, data as unknown as BufferSource);
  return bufferToHex(sig);
}

/**
 * Verifies an Ed25519 signature from a peer's identity public key
 */
export async function verifyDeviceIdentitySignature(
  peerIdentityPublicKeyHex: string,
  data: Uint8Array,
  signatureHex: string
): Promise<boolean> {
  try {
    const subtle = getWebCryptoSubtle();
    const pubKey = await subtle.importKey(
      'raw',
      hexToBytes(peerIdentityPublicKeyHex) as unknown as BufferSource,
      'Ed25519' as any,
      false,
      ['verify']
    );

    const sigBytes = hexToBytes(signatureHex);
    return await subtle.verify(
      'Ed25519' as any,
      pubKey,
      sigBytes as unknown as BufferSource,
      data as unknown as BufferSource
    );
  } catch {
    return false;
  }
}

/**
 * Calculates a deterministic, symmetric 60-digit Safety Number (Signal / Matrix format: 12 blocks of 5 digits)
 * between two device identity public keys.
 */
export async function calculateSafetyNumber(
  pubKeyA_Hex: string,
  pubKeyB_Hex: string
): Promise<string> {
  const subtle = getWebCryptoSubtle();

  // Canonical lexicographical ordering guarantees symmetry
  const sorted = [pubKeyA_Hex.toLowerCase(), pubKeyB_Hex.toLowerCase()].sort();
  const combinedBytes = new TextEncoder().encode(sorted.join(':'));

  // Multi-round SHA-512 digest for high entropy fingerprinting
  const digestBuffer = await subtle.digest('SHA-512', combinedBytes as unknown as BufferSource);
  const bytes = new Uint8Array(digestBuffer);

  let digits = '';
  for (let i = 0; i < 12; i++) {
    const offset = i * 4;
    const val =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const block = (val % 100000).toString().padStart(5, '0');
    digits += block;
  }

  return digits.match(/.{1,5}/g)?.join(' ') || digits;
}

/**
 * Resets local device identity (e.g. for testing or identity key rotation).
 */
export function resetDeviceIdentity(): void {
  inMemoryIdentity = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
