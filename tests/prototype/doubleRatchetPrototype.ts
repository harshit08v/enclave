/**
 * ENCLAVE Double Ratchet Cryptographic Engine Prototype
 * Strict implementation of the Signal Double Ratchet Specification (Perrin & Marlinspike)
 * 
 * Features:
 * - Ed25519 Asymmetric Device Identity Keys (RFC 8032)
 * - X25519 Diffie-Hellman Ratchet (RFC 7748)
 * - Symmetric KDF Chain Ratchet (HKDF-SHA256 & HMAC-SHA256)
 * - AES-256-GCM Authenticated Encryption with Canonical Header AAD
 * - Bounded Skipped Message Keys for Out-of-Order Delivery
 * - Verified Forward Secrecy & Post-Compromise Recovery
 */

import crypto from 'crypto';

export interface IdentityKeyPair {
  publicKey: Buffer;  // 32-byte Ed25519 public key
  privateKey: Buffer; // 32-byte Ed25519 private seed
}

export interface DHKeyPair {
  publicKey: Buffer;  // 32-byte X25519 public key
  privateKey: Buffer; // 32-byte X25519 private key
}

export interface MessageHeader {
  dhPub: Buffer; // Sender's current ephemeral X25519 ratchet public key (32 bytes)
  pn: number;    // Previous chain length
  n: number;     // Message number in current chain
}

export interface RatchetMessage {
  header: MessageHeader;
  iv: Buffer;         // 12-byte CSPRNG IV
  ciphertext: Buffer; // AES-256-GCM ciphertext + 16-byte auth tag
  signature: Buffer;  // Ed25519 signature over header + ciphertext
}

const INFO_ROOT_KDF = Buffer.from('ENCLAVE-v2-DoubleRatchet-RootKDF', 'utf8');
const MAX_SKIPPED_KEYS = 100;

export function generateIdentityKeyPair(): IdentityKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const privRaw = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  return { publicKey: pubRaw, privateKey: privRaw };
}

export function generateDHKeyPair(): DHKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  const pubRaw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const privRaw = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  return { publicKey: pubRaw, privateKey: privRaw };
}

export function computeDH(ourPrivate: Buffer, theirPublic: Buffer): Buffer {
  const privKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b656e04220420', 'hex'),
      ourPrivate
    ]),
    format: 'der',
    type: 'pkcs8'
  });
  const pubKey = crypto.createPublicKey({
    key: Buffer.concat([
      Buffer.from('302a300506032b656e032100', 'hex'),
      theirPublic
    ]),
    format: 'der',
    type: 'spki'
  });
  return crypto.diffieHellman({ privateKey: privKey, publicKey: pubKey });
}

export function signWithIdentity(identity: IdentityKeyPair, data: Buffer): Buffer {
  const privKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      identity.privateKey
    ]),
    format: 'der',
    type: 'pkcs8'
  });
  return crypto.sign(null, data, privKey);
}

export function verifyIdentitySignature(peerPublicKey: Buffer, data: Buffer, signature: Buffer): boolean {
  try {
    const pubKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        peerPublicKey
      ]),
      format: 'der',
      type: 'spki'
    });
    return crypto.verify(null, data, pubKey, signature);
  } catch {
    return false;
  }
}

/**
 * Root KDF: Updates Root Key and derives new Chain Key from Diffie-Hellman output
 */
export function kdfRK(rk: Buffer, dhOut: Buffer): { rk: Buffer; ck: Buffer } {
  const prk = crypto.createHmac('sha256', rk).update(dhOut).digest();
  const infoAnd1 = Buffer.concat([INFO_ROOT_KDF, Buffer.from([1])]);
  const out1 = crypto.createHmac('sha256', prk).update(infoAnd1).digest();
  const infoAnd2 = Buffer.concat([out1, INFO_ROOT_KDF, Buffer.from([2])]);
  const out2 = crypto.createHmac('sha256', prk).update(infoAnd2).digest();

  return {
    rk: out1, // 32 bytes new root key
    ck: out2  // 32 bytes new chain key
  };
}

/**
 * Chain KDF: Computes message key and advances chain key symmetrically
 */
export function kdfCK(ck: Buffer): { nextCk: Buffer; mk: Buffer } {
  const mk = crypto.createHmac('sha256', ck).update(Buffer.from([0x01])).digest();
  const nextCk = crypto.createHmac('sha256', ck).update(Buffer.from([0x02])).digest();
  return { nextCk, mk };
}

export function serializeHeader(header: MessageHeader): Buffer {
  const buf = Buffer.alloc(32 + 4 + 4);
  header.dhPub.copy(buf, 0);
  buf.writeUInt32BE(header.pn, 32);
  buf.writeUInt32BE(header.n, 36);
  return buf;
}

export function calculateSafetyNumber(idA: Buffer, idB: Buffer): string {
  const sorted = [idA, idB].sort(Buffer.compare);
  const hash = crypto.createHash('sha512').update(Buffer.concat(sorted)).digest();
  let digits = '';
  for (let i = 0; i < 12; i++) {
    const val = (hash.readUInt16BE(i * 2) * 65536 + hash.readUInt16BE(i * 2 + 1)) % 100000;
    digits += val.toString().padStart(5, '0');
  }
  return digits.match(/.{1,5}/g)?.join(' ') || digits;
}

export class DoubleRatchetSession {
  public identityKey: IdentityKeyPair;
  public peerIdentityPublicKey: Buffer | null = null;
  public dhPair: DHKeyPair;
  public peerDHPublicKey: Buffer | null = null;
  public rootKey: Buffer;
  public sendingChainKey: Buffer | null = null;
  public receivingChainKey: Buffer | null = null;
  public sendSequence = 0;
  public recvSequence = 0;
  public previousSendingChainLength = 0;
  public skippedMessageKeys: Map<string, Buffer> = new Map();

  constructor(
    identityKey: IdentityKeyPair,
    sharedMasterSecret: Buffer,
    isInitiator: boolean,
    peerDHPublicKey?: Buffer,
    peerIdentityPublicKey?: Buffer
  ) {
    this.identityKey = identityKey;
    this.peerIdentityPublicKey = peerIdentityPublicKey || null;
    this.dhPair = generateDHKeyPair();

    if (isInitiator) {
      if (!peerDHPublicKey) throw new Error('Initiator requires peer public DH key');
      this.peerDHPublicKey = peerDHPublicKey;
      const dhSecret = computeDH(this.dhPair.privateKey, this.peerDHPublicKey);
      const { rk, ck } = kdfRK(sharedMasterSecret, dhSecret);
      this.rootKey = rk;
      this.sendingChainKey = ck;
      this.receivingChainKey = null;
    } else {
      this.peerDHPublicKey = null;
      this.rootKey = sharedMasterSecret;
      this.sendingChainKey = null;
      this.receivingChainKey = null;
    }
  }

  public encrypt(plaintext: string): RatchetMessage {
    if (!this.sendingChainKey) {
      throw new Error('Sending chain not initialized');
    }

    const { nextCk, mk } = kdfCK(this.sendingChainKey);
    this.sendingChainKey = nextCk;

    const header: MessageHeader = {
      dhPub: this.dhPair.publicKey,
      pn: this.previousSendingChainLength,
      n: this.sendSequence++
    };

    const headerBytes = serializeHeader(header);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', mk, iv);
    cipher.setAAD(headerBytes);
    const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final(), cipher.getAuthTag()]);

    // Zeroize single-use message key
    mk.fill(0);

    const signPayload = Buffer.concat([headerBytes, iv, ct]);
    const signature = signWithIdentity(this.identityKey, signPayload);

    return { header, iv, ciphertext: ct, signature };
  }

  public decrypt(message: RatchetMessage): string {
    const headerBytes = serializeHeader(message.header);
    const signPayload = Buffer.concat([headerBytes, message.iv, message.ciphertext]);

    // Verify asymmetric device signature
    if (this.peerIdentityPublicKey) {
      const validSig = verifyIdentitySignature(this.peerIdentityPublicKey, signPayload, message.signature);
      if (!validSig) {
        throw new Error('Cryptographic signature verification failed: invalid sender identity signature');
      }
    }

    // Check skipped keys
    const skippedKeyId = `${message.header.dhPub.toString('hex')}:${message.header.n}`;
    if (this.skippedMessageKeys.has(skippedKeyId)) {
      const mk = this.skippedMessageKeys.get(skippedKeyId)!;
      this.skippedMessageKeys.delete(skippedKeyId);
      const pt = this.decryptWithKey(mk, message.iv, message.ciphertext, headerBytes);
      mk.fill(0);
      return pt;
    }

    // Replay check: if same DH ratchet and message number is behind current receive sequence, reject duplicate
    if (this.peerDHPublicKey && this.peerDHPublicKey.equals(message.header.dhPub) && message.header.n < this.recvSequence) {
      throw new Error('Duplicate or replayed message: sequence number already consumed');
    }

    // If new DH ratchet public key received, ratchet the DH chain
    if (!this.peerDHPublicKey || !this.peerDHPublicKey.equals(message.header.dhPub)) {
      this.skipMessageKeys(message.header.pn);
      this.dhRatchet(message.header.dhPub);
    }

    // Skip any missed messages in the receiving chain
    this.skipMessageKeys(message.header.n);

    if (!this.receivingChainKey) {
      throw new Error('Receiving chain key uninitialized');
    }

    const { nextCk, mk } = kdfCK(this.receivingChainKey);
    this.receivingChainKey = nextCk;
    this.recvSequence++;

    const plaintext = this.decryptWithKey(mk, message.iv, message.ciphertext, headerBytes);
    mk.fill(0);
    return plaintext;
  }

  private dhRatchet(theirNewDHPublicKey: Buffer) {
    this.previousSendingChainLength = this.sendSequence;
    this.sendSequence = 0;
    this.recvSequence = 0;
    this.peerDHPublicKey = theirNewDHPublicKey;

    // 1. Compute DH with our current private key & their new public key -> derive new receiving chain
    const dh1 = computeDH(this.dhPair.privateKey, this.peerDHPublicKey);
    const rk1 = kdfRK(this.rootKey, dh1);
    this.rootKey = rk1.rk;
    this.receivingChainKey = rk1.ck;

    // 2. Generate our fresh new DH keypair & compute DH with their new public key -> derive new sending chain
    this.dhPair = generateDHKeyPair();
    const dh2 = computeDH(this.dhPair.privateKey, this.peerDHPublicKey);
    const rk2 = kdfRK(this.rootKey, dh2);
    this.rootKey = rk2.rk;
    this.sendingChainKey = rk2.ck;
  }

  private skipMessageKeys(until: number) {
    if (this.recvSequence + 100 < until) {
      throw new Error('Too many skipped messages; exceeds ratchet security bounds');
    }
    if (this.receivingChainKey) {
      while (this.recvSequence < until) {
        const { nextCk, mk } = kdfCK(this.receivingChainKey);
        this.receivingChainKey = nextCk;
        if (this.peerDHPublicKey) {
          const keyId = `${this.peerDHPublicKey.toString('hex')}:${this.recvSequence}`;
          this.skippedMessageKeys.set(keyId, mk);
          if (this.skippedMessageKeys.size > MAX_SKIPPED_KEYS) {
            const firstKey = this.skippedMessageKeys.keys().next().value;
            if (firstKey) this.skippedMessageKeys.delete(firstKey);
          }
        }
        this.recvSequence++;
      }
    }
  }

  private decryptWithKey(mk: Buffer, iv: Buffer, ciphertext: Buffer, aad: Buffer): string {
    const authTag = ciphertext.subarray(-16);
    const ct = ciphertext.subarray(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', mk, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
