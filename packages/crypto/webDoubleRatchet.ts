/**
 * ENCLAVE WebCrypto Double Ratchet Cryptographic Engine
 * Strict implementation of the Signal Double Ratchet Specification (Perrin & Marlinspike)
 * using standard W3C Web Cryptography API (SubtleCrypto).
 *
 * Runs natively in modern browsers (Chrome 113+, Safari 17+, Firefox 129+) and Node.js 20+
 * without Node.js `crypto` module dependencies.
 *
 * Security Features:
 * - Ed25519 Asymmetric Device Identity Signatures (RFC 8032)
 * - X25519 Diffie-Hellman Ratcheting (RFC 7748)
 * - Symmetric KDF Chain Ratchet (HMAC-SHA256 & HKDF-SHA256)
 * - AES-256-GCM Authenticated Encryption with Canonical Header AAD
 * - Bounded Skipped Message Keys for Out-of-Order Delivery (max 100)
 * - Anti-Replay: Retired DH Key Rejection & Consumed Sequence Checks
 * - Forward Secrecy: Per-message key generation & instant zeroization
 * - Post-Compromise Security (PCS): Fresh DH keypairs on every reply round-trip
 */

import { getWebCryptoSubtle, bufferToHex, hexToBytes } from './index';

export interface RatchetHeader {
  dhPub: string; // Hex-encoded 32-byte X25519 public key
  pn: number;    // Previous chain message count
  n: number;     // Message sequence index in current chain
}

export interface EncryptedRatchetPayload {
  ciphertext: string; // Base64 ciphertext with appended 128-bit GCM tag
  iv: string;         // Base64 96-bit (12-byte) IV
  ratchetHeader: RatchetHeader;
  signature: string;  // Hex-encoded Ed25519 signature
}

const INFO_ROOT_KDF = new TextEncoder().encode('ENCLAVE-v2-DoubleRatchet-RootKDF');
const MAX_SKIPPED_KEYS = 100;

/**
 * Computes HMAC-SHA256 over data using a raw key buffer
 */
async function hmacSha256(keyBytes: Uint8Array, dataBytes: Uint8Array): Promise<Uint8Array> {
  const subtle = getWebCryptoSubtle();
  const key = await subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await subtle.sign('HMAC', key, dataBytes as unknown as BufferSource);
  return new Uint8Array(sig);
}

/**
 * Root KDF: Derives new 32-byte Root Key and 32-byte Chain Key from DH output
 */
export async function kdfRK(
  rk: Uint8Array,
  dhOut: Uint8Array
): Promise<{ rk: Uint8Array; ck: Uint8Array }> {
  const prk = await hmacSha256(rk, dhOut);

  // out1 = HMAC(prk, INFO || 0x01)
  const info1 = new Uint8Array(INFO_ROOT_KDF.length + 1);
  info1.set(INFO_ROOT_KDF, 0);
  info1[INFO_ROOT_KDF.length] = 0x01;
  const out1 = await hmacSha256(prk, info1);

  // out2 = HMAC(prk, out1 || INFO || 0x02)
  const info2 = new Uint8Array(out1.length + INFO_ROOT_KDF.length + 1);
  info2.set(out1, 0);
  info2.set(INFO_ROOT_KDF, out1.length);
  info2[out1.length + INFO_ROOT_KDF.length] = 0x02;
  const out2 = await hmacSha256(prk, info2);

  return { rk: out1, ck: out2 };
}

/**
 * Chain KDF: Computes single-use message key (0x01) and advances chain key (0x02)
 */
export async function kdfCK(
  ck: Uint8Array
): Promise<{ nextCk: Uint8Array; mk: Uint8Array }> {
  const mk = await hmacSha256(ck, new Uint8Array([0x01]));
  const nextCk = await hmacSha256(ck, new Uint8Array([0x02]));
  return { nextCk, mk };
}

/**
 * Computes X25519 Diffie-Hellman shared secret
 */
export async function computeWebCryptoDH(
  ourPrivateKey: CryptoKey,
  theirPublicRawHex: string
): Promise<Uint8Array> {
  const subtle = getWebCryptoSubtle();
  const pubBytes = hexToBytes(theirPublicRawHex);
  const peerPubKey = await subtle.importKey(
    'raw',
    pubBytes as unknown as BufferSource,
    { name: 'X25519' as any },
    false,
    []
  );
  const derivedBits = await subtle.deriveBits(
    { name: 'X25519' as any, public: peerPubKey },
    ourPrivateKey,
    256
  );
  return new Uint8Array(derivedBits);
}

/**
 * Serializes RatchetHeader into a 40-byte canonical binary buffer for AAD
 */
export function serializeRatchetHeader(header: RatchetHeader): Uint8Array {
  const buf = new Uint8Array(40);
  const pubBytes = hexToBytes(header.dhPub);
  buf.set(pubBytes.slice(0, 32), 0);
  const view = new DataView(buf.buffer);
  view.setUint32(32, header.pn, false); // Big-Endian uint32
  view.setUint32(36, header.n, false);  // Big-Endian uint32
  return buf;
}

export class WebDoubleRatchetSession {
  public localIdentityKeyHex: string;
  public localIdentityPrivateKeyPkcs8Hex: string;
  public peerIdentityPublicKeyHex: string | null;

  public dhPrivateKey: CryptoKey;
  public dhPublicKeyHex: string;
  public peerDHPublicKeyHex: string | null = null;

  public rootKey: Uint8Array;
  public sendingChainKey: Uint8Array | null = null;
  public receivingChainKey: Uint8Array | null = null;

  public sendSequence = 0;
  public recvSequence = 0;
  public previousSendingChainLength = 0;

  public skippedMessageKeys: Map<string, Uint8Array> = new Map();
  public pastDHPublicKeys: Set<string> = new Set();

  private constructor(
    localIdentityKeyHex: string,
    localIdentityPrivateKeyPkcs8Hex: string,
    dhPrivateKey: CryptoKey,
    dhPublicKeyHex: string,
    rootKey: Uint8Array,
    peerIdentityPublicKeyHex?: string | null,
    peerDHPublicKeyHex?: string | null
  ) {
    this.localIdentityKeyHex = localIdentityKeyHex;
    this.localIdentityPrivateKeyPkcs8Hex = localIdentityPrivateKeyPkcs8Hex;
    this.dhPrivateKey = dhPrivateKey;
    this.dhPublicKeyHex = dhPublicKeyHex;
    this.rootKey = rootKey;
    this.peerIdentityPublicKeyHex = peerIdentityPublicKeyHex || null;
    this.peerDHPublicKeyHex = peerDHPublicKeyHex || null;
  }

  /**
   * Initializes a new WebDoubleRatchetSession asynchronously
   */
  public static async create(
    localIdentityKeyHex: string,
    localIdentityPrivateKeyPkcs8Hex: string,
    sharedMasterSecret: Uint8Array,
    isInitiator: boolean,
    peerDHPublicKeyHex?: string | null,
    peerIdentityPublicKeyHex?: string | null,
    localPrekeyPrivateKeyPkcs8Hex?: string | null,
    localPrekeyPublicKeyHex?: string | null
  ): Promise<WebDoubleRatchetSession> {
    const subtle = getWebCryptoSubtle();

    let dhPrivateKey: CryptoKey;
    let dhPublicKeyHex: string;

    if (!isInitiator && localPrekeyPrivateKeyPkcs8Hex && localPrekeyPublicKeyHex) {
      // Responder initializes using their established prekey
      dhPrivateKey = await subtle.importKey(
        'pkcs8',
        hexToBytes(localPrekeyPrivateKeyPkcs8Hex) as unknown as BufferSource,
        { name: 'X25519' as any },
        false,
        ['deriveBits']
      );
      dhPublicKeyHex = localPrekeyPublicKeyHex;
    } else {
      // Initiator (or fresh responder without prekey) generates a fresh ephemeral X25519 DH keypair
      const dhPair = (await subtle.generateKey(
        { name: 'X25519' as any },
        true,
        ['deriveBits']
      )) as CryptoKeyPair;

      dhPrivateKey = dhPair.privateKey;
      const pubRaw = await subtle.exportKey('raw', dhPair.publicKey);
      dhPublicKeyHex = bufferToHex(pubRaw);
    }

    const session = new WebDoubleRatchetSession(
      localIdentityKeyHex,
      localIdentityPrivateKeyPkcs8Hex,
      dhPrivateKey,
      dhPublicKeyHex,
      new Uint8Array(sharedMasterSecret),
      peerIdentityPublicKeyHex,
      peerDHPublicKeyHex
    );

    if (isInitiator && peerDHPublicKeyHex) {
      session.peerDHPublicKeyHex = peerDHPublicKeyHex;
      session.pastDHPublicKeys.add(peerDHPublicKeyHex.toLowerCase());
      const dhSecret = await computeWebCryptoDH(session.dhPrivateKey, peerDHPublicKeyHex);
      const { rk, ck } = await kdfRK(session.rootKey, dhSecret);
      session.rootKey = rk;
      session.sendingChainKey = ck;
      session.receivingChainKey = null;
    } else {
      session.peerDHPublicKeyHex = null;
      session.sendingChainKey = null;
      session.receivingChainKey = null;
    }

    return session;
  }

  /**
   * Advances the sending ratchet chain and encrypts plaintext with single-use message key
   */
  public async ratchetEncrypt(plaintext: string): Promise<EncryptedRatchetPayload> {
    const subtle = getWebCryptoSubtle();

    // If sending chain not yet established, advance DH ratchet if peer DH key is known
    if (!this.sendingChainKey) {
      if (!this.peerDHPublicKeyHex) {
        throw new Error('Cannot encrypt: peer ratchet DH public key is uninitialized');
      }
      const dh = await computeWebCryptoDH(this.dhPrivateKey, this.peerDHPublicKeyHex);
      const { rk, ck } = await kdfRK(this.rootKey, dh);
      this.rootKey = rk;
      this.sendingChainKey = ck;
    }

    // 1. Advance symmetric sending chain KDF
    const { nextCk, mk } = await kdfCK(this.sendingChainKey);
    this.sendingChainKey = nextCk;

    // 2. Construct ratchet header
    const header: RatchetHeader = {
      dhPub: this.dhPublicKeyHex,
      pn: this.previousSendingChainLength,
      n: this.sendSequence++
    };
    const headerAAD = serializeRatchetHeader(header);

    // 3. Encrypt with AES-256-GCM using MK and header AAD
    const iv = new Uint8Array(12);
    (globalThis.crypto || (subtle as any)).getRandomValues(iv);

    const aesKey = await subtle.importKey(
      'raw',
      mk as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ctBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        additionalData: headerAAD as unknown as BufferSource,
        tagLength: 128
      },
      aesKey,
      plaintextBytes as unknown as BufferSource
    );

    // 4. Instant zeroization of single-use message key
    mk.fill(0);

    const ctBytes = new Uint8Array(ctBuffer);

    // 5. Sign canonical payload [headerAAD || iv || ctBytes] with Ed25519 identity key
    const signPayload = new Uint8Array(headerAAD.length + iv.length + ctBytes.length);
    signPayload.set(headerAAD, 0);
    signPayload.set(iv, headerAAD.length);
    signPayload.set(ctBytes, headerAAD.length + iv.length);

    const idPrivKey = await subtle.importKey(
      'pkcs8',
      hexToBytes(this.localIdentityPrivateKeyPkcs8Hex) as unknown as BufferSource,
      { name: 'Ed25519' as any },
      false,
      ['sign']
    );

    const sigBuffer = await subtle.sign(
      { name: 'Ed25519' as any },
      idPrivKey,
      signPayload as unknown as BufferSource
    );
    const signature = bufferToHex(sigBuffer);

    // Convert ciphertext and IV to Base64
    let binaryCt = '';
    for (let i = 0; i < ctBytes.byteLength; i++) binaryCt += String.fromCharCode(ctBytes[i]);
    const ciphertextBase64 = btoa(binaryCt);

    let binaryIv = '';
    for (let i = 0; i < iv.byteLength; i++) binaryIv += String.fromCharCode(iv[i]);
    const ivBase64 = btoa(binaryIv);

    return {
      ciphertext: ciphertextBase64,
      iv: ivBase64,
      ratchetHeader: header,
      signature
    };
  }

  /**
   * Authenticates and decrypts an incoming ratchet message
   */
  public async ratchetDecrypt(
    ciphertextBase64: string,
    ivBase64: string,
    header: RatchetHeader,
    signatureHex?: string,
    canonicalEnvelopePayload?: Uint8Array
  ): Promise<string> {
    const subtle = getWebCryptoSubtle();

    // 1. Reconstruct binary buffers
    const headerAAD = serializeRatchetHeader(header);

    const binaryIv = atob(ivBase64);
    const ivBytes = new Uint8Array(binaryIv.length);
    for (let i = 0; i < binaryIv.length; i++) ivBytes[i] = binaryIv.charCodeAt(i);

    const binaryCt = atob(ciphertextBase64);
    const ctBytes = new Uint8Array(binaryCt.length);
    for (let i = 0; i < binaryCt.length; i++) ctBytes[i] = binaryCt.charCodeAt(i);

    // 2. Verify asymmetric Ed25519 device signature if present
    if (this.peerIdentityPublicKeyHex && signatureHex) {
      const peerIdPubKey = await subtle.importKey(
        'raw',
        hexToBytes(this.peerIdentityPublicKeyHex) as unknown as BufferSource,
        { name: 'Ed25519' as any },
        false,
        ['verify']
      );

      const sigBytes = hexToBytes(signatureHex);
      let validSig = false;

      if (canonicalEnvelopePayload) {
        validSig = await subtle.verify(
          { name: 'Ed25519' as any },
          peerIdPubKey,
          sigBytes as unknown as BufferSource,
          canonicalEnvelopePayload as unknown as BufferSource
        );
      }

      if (!validSig) {
        const signPayload = new Uint8Array(headerAAD.length + ivBytes.length + ctBytes.length);
        signPayload.set(headerAAD, 0);
        signPayload.set(ivBytes, headerAAD.length);
        signPayload.set(ctBytes, headerAAD.length + ivBytes.length);

        validSig = await subtle.verify(
          { name: 'Ed25519' as any },
          peerIdPubKey,
          sigBytes as unknown as BufferSource,
          signPayload as unknown as BufferSource
        );
      }

      if (!validSig) {
        throw new Error('[DOUBLE RATCHET SECURITY] Invalid Ed25519 identity signature on incoming wire packet');
      }
    }

    const normDhPub = header.dhPub.toLowerCase();

    // 3. Check for out-of-order delivery in skipped message keys cache
    const skippedKeyId = `${normDhPub}:${header.n}`;
    if (this.skippedMessageKeys.has(skippedKeyId)) {
      const mk = this.skippedMessageKeys.get(skippedKeyId)!;
      this.skippedMessageKeys.delete(skippedKeyId);
      const plaintext = await this.decryptWithKey(mk, ivBytes, ctBytes, headerAAD);
      mk.fill(0);
      return plaintext;
    }

    // 4. Anti-Replay: Reject message if DH ratchet key has already been retired
    if (
      this.pastDHPublicKeys.has(normDhPub) &&
      (!this.peerDHPublicKeyHex || this.peerDHPublicKeyHex.toLowerCase() !== normDhPub)
    ) {
      throw new Error('[DOUBLE RATCHET REPLAY] Duplicate message from past ratchet: DH key already retired');
    }

    // 5. Anti-Replay: Reject duplicate sequence number within current receiving chain
    if (
      this.peerDHPublicKeyHex &&
      this.peerDHPublicKeyHex.toLowerCase() === normDhPub &&
      header.n < this.recvSequence
    ) {
      throw new Error(`[DOUBLE RATCHET REPLAY] Duplicate message: sequence ${header.n} already consumed`);
    }

    // 6. DH Ratchet step: If peer sent a new DH public key, perform DH ratchet transition
    if (!this.peerDHPublicKeyHex || this.peerDHPublicKeyHex.toLowerCase() !== normDhPub) {
      await this.skipMessageKeys(header.pn);
      await this.dhRatchet(normDhPub);
    }

    // 7. Skip any missing messages in receiving chain up to header.n
    await this.skipMessageKeys(header.n);

    if (!this.receivingChainKey) {
      throw new Error('Receiving chain uninitialized');
    }

    // 8. Derive single-use message key and advance receiving chain
    const { nextCk, mk } = await kdfCK(this.receivingChainKey);
    this.receivingChainKey = nextCk;
    this.recvSequence++;

    // 9. Decrypt ciphertext with AES-256-GCM
    const plaintext = await this.decryptWithKey(mk, ivBytes, ctBytes, headerAAD);
    mk.fill(0);
    return plaintext;
  }

  private async dhRatchet(theirNewDHPublicKeyHex: string): Promise<void> {
    const subtle = getWebCryptoSubtle();

    this.previousSendingChainLength = this.sendSequence;
    this.sendSequence = 0;
    this.recvSequence = 0;
    this.peerDHPublicKeyHex = theirNewDHPublicKeyHex;
    this.pastDHPublicKeys.add(theirNewDHPublicKeyHex);

    // Step A: Compute DH with our current private key & their new public key -> derive new receiving chain
    const dh1 = await computeWebCryptoDH(this.dhPrivateKey, theirNewDHPublicKeyHex);
    const rk1 = await kdfRK(this.rootKey, dh1);
    this.rootKey = rk1.rk;
    this.receivingChainKey = rk1.ck;

    // Step B: Generate fresh local DH keypair & compute DH with their new public key -> derive new sending chain
    const newDhPair = (await subtle.generateKey(
      { name: 'X25519' as any },
      true,
      ['deriveBits']
    )) as CryptoKeyPair;

    this.dhPrivateKey = newDhPair.privateKey;
    const pubRaw = await subtle.exportKey('raw', newDhPair.publicKey);
    this.dhPublicKeyHex = bufferToHex(pubRaw);

    const dh2 = await computeWebCryptoDH(this.dhPrivateKey, theirNewDHPublicKeyHex);
    const rk2 = await kdfRK(this.rootKey, dh2);
    this.rootKey = rk2.rk;
    this.sendingChainKey = rk2.ck;
  }

  private async skipMessageKeys(until: number): Promise<void> {
    if (this.recvSequence + 100 < until) {
      throw new Error('[DOUBLE RATCHET BOUNDS] Too many skipped messages; exceeds security threshold');
    }
    if (this.receivingChainKey && this.peerDHPublicKeyHex) {
      while (this.recvSequence < until) {
        const { nextCk, mk } = await kdfCK(this.receivingChainKey);
        this.receivingChainKey = nextCk;
        const keyId = `${this.peerDHPublicKeyHex.toLowerCase()}:${this.recvSequence}`;
        this.skippedMessageKeys.set(keyId, mk);

        if (this.skippedMessageKeys.size > MAX_SKIPPED_KEYS) {
          const firstKey = this.skippedMessageKeys.keys().next().value;
          if (firstKey) this.skippedMessageKeys.delete(firstKey);
        }
        this.recvSequence++;
      }
    }
  }

  private async decryptWithKey(
    mk: Uint8Array,
    ivBytes: Uint8Array,
    ctBytes: Uint8Array,
    headerAAD: Uint8Array
  ): Promise<string> {
    const subtle = getWebCryptoSubtle();
    const aesKey = await subtle.importKey(
      'raw',
      mk as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as unknown as BufferSource,
        additionalData: headerAAD as unknown as BufferSource,
        tagLength: 128
      },
      aesKey,
      ctBytes as unknown as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  }
}
