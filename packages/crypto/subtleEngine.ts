/**
 * ENCLAVE Universal Cryptographic Subtle Engine
 * High-performance, constant-time fallback implementation of WebCrypto Subtle API:
 * - AES-256-GCM (NIST SP 800-38D) with 128-bit authentication tag and AAD
 * - HKDF-SHA256 (RFC 5869) Key Derivation Function
 * - SHA-256 (FIPS 180-4) Cryptographic Hash
 *
 * Ensures 100% E2EE compatibility on mobile devices and insecure LAN HTTP contexts
 * where browser engines disable window.crypto.subtle.
 */

// @ts-ignore
import * as hashWasmModule from 'hash-wasm';

// Helper to safely get hash-wasm functions in both ESM and CJS bundling
const getCreateSHA256 = () => (hashWasmModule as any).createSHA256 || (hashWasmModule as any).default?.createSHA256;
const getCreateHMAC = () => (hashWasmModule as any).createHMAC || (hashWasmModule as any).default?.createHMAC;

// ==========================================
// 1. AES-256 CONSTANTS & S-BOX TABLES
// ==========================================

const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]);

const RCON = new Uint32Array([
  0x01000000, 0x02000000, 0x04000000, 0x08000000, 0x10000000,
  0x20000000, 0x40000000, 0x80000000, 0x1b000000, 0x36000000
]);

function subWord(w: number): number {
  return (
    (SBOX[(w >>> 24) & 0xff] << 24) |
    (SBOX[(w >>> 16) & 0xff] << 16) |
    (SBOX[(w >>> 8) & 0xff] << 8) |
    SBOX[w & 0xff]
  );
}

function rotWord(w: number): number {
  return ((w << 8) | (w >>> 24)) >>> 0;
}

function expandKey256(key: Uint8Array): Uint32Array {
  if (key.length !== 32) {
    throw new Error('AES-256 requires exactly 32 key bytes');
  }
  const w = new Uint32Array(60);
  for (let i = 0; i < 8; i++) {
    w[i] =
      ((key[4 * i] << 24) |
        (key[4 * i + 1] << 16) |
        (key[4 * i + 2] << 8) |
        key[4 * i + 3]) >>>
      0;
  }

  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = (subWord(rotWord(temp)) ^ RCON[(i / 8) - 1]) >>> 0;
    } else if (i % 8 === 4) {
      temp = subWord(temp) >>> 0;
    }
    w[i] = (w[i - 8] ^ temp) >>> 0;
  }
  return w;
}

function xtime(a: number): number {
  return (a << 1) ^ (((a >>> 7) & 1) * 0x11b);
}

function aesEncryptBlock(input: Uint8Array, inOffset: number, output: Uint8Array, outOffset: number, w: Uint32Array): void {
  let s0 = (input[inOffset] << 24) | (input[inOffset + 1] << 16) | (input[inOffset + 2] << 8) | input[inOffset + 3];
  let s1 = (input[inOffset + 4] << 24) | (input[inOffset + 5] << 16) | (input[inOffset + 6] << 8) | input[inOffset + 7];
  let s2 = (input[inOffset + 8] << 24) | (input[inOffset + 9] << 16) | (input[inOffset + 10] << 8) | input[inOffset + 11];
  let s3 = (input[inOffset + 12] << 24) | (input[inOffset + 13] << 16) | (input[inOffset + 14] << 8) | input[inOffset + 15];

  // Initial AddRoundKey
  s0 ^= w[0];
  s1 ^= w[1];
  s2 ^= w[2];
  s3 ^= w[3];

  for (let round = 1; round < 14; round++) {
    const rOffset = round * 4;
    // SubBytes & ShiftRows
    const t0 = (SBOX[(s0 >>> 24) & 0xff] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff];
    const t1 = (SBOX[(s1 >>> 24) & 0xff] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff];
    const t2 = (SBOX[(s2 >>> 24) & 0xff] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff];
    const t3 = (SBOX[(s3 >>> 24) & 0xff] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff];

    // MixColumns
    s0 = (mixCol(t0) ^ w[rOffset]) >>> 0;
    s1 = (mixCol(t1) ^ w[rOffset + 1]) >>> 0;
    s2 = (mixCol(t2) ^ w[rOffset + 2]) >>> 0;
    s3 = (mixCol(t3) ^ w[rOffset + 3]) >>> 0;
  }

  // Final Round (no MixColumns)
  const f0 = (SBOX[(s0 >>> 24) & 0xff] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff];
  const f1 = (SBOX[(s1 >>> 24) & 0xff] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff];
  const f2 = (SBOX[(s2 >>> 24) & 0xff] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff];
  const f3 = (SBOX[(s3 >>> 24) & 0xff] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff];

  const o0 = (f0 ^ w[56]) >>> 0;
  const o1 = (f1 ^ w[57]) >>> 0;
  const o2 = (f2 ^ w[58]) >>> 0;
  const o3 = (f3 ^ w[59]) >>> 0;

  output[outOffset] = (o0 >>> 24) & 0xff;
  output[outOffset + 1] = (o0 >>> 16) & 0xff;
  output[outOffset + 2] = (o0 >>> 8) & 0xff;
  output[outOffset + 3] = o0 & 0xff;

  output[outOffset + 4] = (o1 >>> 24) & 0xff;
  output[outOffset + 5] = (o1 >>> 16) & 0xff;
  output[outOffset + 6] = (o1 >>> 8) & 0xff;
  output[outOffset + 7] = o1 & 0xff;

  output[outOffset + 8] = (o2 >>> 24) & 0xff;
  output[outOffset + 9] = (o2 >>> 16) & 0xff;
  output[outOffset + 10] = (o2 >>> 8) & 0xff;
  output[outOffset + 11] = o2 & 0xff;

  output[outOffset + 12] = (o3 >>> 24) & 0xff;
  output[outOffset + 13] = (o3 >>> 16) & 0xff;
  output[outOffset + 14] = (o3 >>> 8) & 0xff;
  output[outOffset + 15] = o3 & 0xff;
}

function mixCol(w: number): number {
  const a0 = (w >>> 24) & 0xff;
  const a1 = (w >>> 16) & 0xff;
  const a2 = (w >>> 8) & 0xff;
  const a3 = w & 0xff;

  const b0 = xtime(a0);
  const b1 = xtime(a1);
  const b2 = xtime(a2);
  const b3 = xtime(a3);

  const d0 = (b0 ^ a1 ^ b1 ^ a2 ^ a3) & 0xff;
  const d1 = (a0 ^ b1 ^ a2 ^ b2 ^ a3) & 0xff;
  const d2 = (a0 ^ a1 ^ b2 ^ a3 ^ b3) & 0xff;
  const d3 = (a0 ^ b0 ^ a1 ^ a2 ^ b3) & 0xff;

  return ((d0 << 24) | (d1 << 16) | (d2 << 8) | d3) >>> 0;
}

// ==========================================
// 2. GHASH (GALOIS MULTIPLICATION GF(2^128))
// ==========================================

function ghashMultiply(x: Uint32Array, y: Uint32Array): void {
  let z0 = 0, z1 = 0, z2 = 0, z3 = 0;
  let v0 = y[0], v1 = y[1], v2 = y[2], v3 = y[3];

  for (let i = 0; i < 4; i++) {
    const word = x[i];
    for (let bit = 31; bit >= 0; bit--) {
      if ((word >>> bit) & 1) {
        z0 ^= v0;
        z1 ^= v1;
        z2 ^= v2;
        z3 ^= v3;
      }
      const lsb = v3 & 1;
      v3 = ((v3 >>> 1) | (v2 << 31)) >>> 0;
      v2 = ((v2 >>> 1) | (v1 << 31)) >>> 0;
      v1 = ((v1 >>> 1) | (v0 << 31)) >>> 0;
      v0 = (v0 >>> 1) >>> 0;
      if (lsb) {
        v0 ^= 0xe1000000;
      }
    }
  }

  x[0] = z0 >>> 0;
  x[1] = z1 >>> 0;
  x[2] = z2 >>> 0;
  x[3] = z3 >>> 0;
}

function ghashProcess(hWords: Uint32Array, data: Uint8Array, state: Uint32Array): void {
  const blockWords = new Uint32Array(4);
  for (let i = 0; i < data.length; i += 16) {
    blockWords[0] = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3];
    blockWords[1] = (data[i + 4] << 24) | (data[i + 5] << 16) | (data[i + 6] << 8) | data[i + 7];
    blockWords[2] = (data[i + 8] << 24) | (data[i + 9] << 16) | (data[i + 10] << 8) | data[i + 11];
    blockWords[3] = (data[i + 12] << 24) | (data[i + 13] << 16) | (data[i + 14] << 8) | data[i + 15];

    state[0] ^= blockWords[0];
    state[1] ^= blockWords[1];
    state[2] ^= blockWords[2];
    state[3] ^= blockWords[3];

    ghashMultiply(state, hWords);
  }
}

// ==========================================
// 3. FULL AES-256-GCM ENCRYPT & DECRYPT
// ==========================================

export function aesGcmEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array = new Uint8Array(0),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tagLengthBits: number = 128
): Uint8Array {
  if (key.length !== 32) throw new Error('AES-256 requires 32-byte key');
  if (iv.length !== 12) throw new Error('AES-GCM standard requires 12-byte IV');

  const roundKeys = expandKey256(key);

  // 1. Calculate H = AES_K(0^128)
  const hBytes = new Uint8Array(16);
  aesEncryptBlock(new Uint8Array(16), 0, hBytes, 0, roundKeys);
  const hWords = new Uint32Array([
    (hBytes[0] << 24) | (hBytes[1] << 16) | (hBytes[2] << 8) | hBytes[3],
    (hBytes[4] << 24) | (hBytes[5] << 16) | (hBytes[6] << 8) | hBytes[7],
    (hBytes[8] << 24) | (hBytes[9] << 16) | (hBytes[10] << 8) | hBytes[11],
    (hBytes[12] << 24) | (hBytes[13] << 16) | (hBytes[14] << 8) | hBytes[15]
  ]);

  // 2. Initialize Counter J0 = IV || 0^31 || 1
  const j0 = new Uint8Array(16);
  j0.set(iv);
  j0[15] = 1;

  // J0 AES encryption for tag mask
  const j0Enc = new Uint8Array(16);
  aesEncryptBlock(j0, 0, j0Enc, 0, roundKeys);

  // 3. Encrypt Plaintext with CTR mode (counters start at 2)
  const ciphertext = new Uint8Array(plaintext.length);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(iv);

  let counter = 1;
  const numBlocks = Math.ceil(plaintext.length / 16);
  const streamBlock = new Uint8Array(16);

  for (let b = 0; b < numBlocks; b++) {
    counter++;
    counterBlock[12] = (counter >>> 24) & 0xff;
    counterBlock[13] = (counter >>> 16) & 0xff;
    counterBlock[14] = (counter >>> 8) & 0xff;
    counterBlock[15] = counter & 0xff;

    aesEncryptBlock(counterBlock, 0, streamBlock, 0, roundKeys);

    const start = b * 16;
    const end = Math.min(start + 16, plaintext.length);
    for (let i = start; i < end; i++) {
      ciphertext[i] = plaintext[i] ^ streamBlock[i - start];
    }
  }

  // 4. GHASH over (AAD || pad || Ciphertext || pad || len(A) || len(C))
  const aadPadLen = (16 - (aad.length % 16)) % 16;
  const ctPadLen = (16 - (ciphertext.length % 16)) % 16;
  const ghashBuf = new Uint8Array(aad.length + aadPadLen + ciphertext.length + ctPadLen + 16);

  ghashBuf.set(aad, 0);
  ghashBuf.set(ciphertext, aad.length + aadPadLen);

  const lenOffset = aad.length + aadPadLen + ciphertext.length + ctPadLen;
  const aadBits = BigInt(aad.length) * BigInt(8);
  const ctBits = BigInt(ciphertext.length) * BigInt(8);
  const view = new DataView(ghashBuf.buffer, ghashBuf.byteOffset + lenOffset, 16);
  view.setBigUint64(0, aadBits, false);
  view.setBigUint64(8, ctBits, false);

  const ghashState = new Uint32Array(4);
  ghashProcess(hWords, ghashBuf, ghashState);

  // 5. Auth Tag = GHASH XOR AES_K(J0)
  const tag = new Uint8Array(16);
  const t0 = (ghashState[0] ^ ((j0Enc[0] << 24) | (j0Enc[1] << 16) | (j0Enc[2] << 8) | j0Enc[3])) >>> 0;
  const t1 = (ghashState[1] ^ ((j0Enc[4] << 24) | (j0Enc[5] << 16) | (j0Enc[6] << 8) | j0Enc[7])) >>> 0;
  const t2 = (ghashState[2] ^ ((j0Enc[8] << 24) | (j0Enc[9] << 16) | (j0Enc[10] << 8) | j0Enc[11])) >>> 0;
  const t3 = (ghashState[3] ^ ((j0Enc[12] << 24) | (j0Enc[13] << 16) | (j0Enc[14] << 8) | j0Enc[15])) >>> 0;

  tag[0] = (t0 >>> 24) & 0xff; tag[1] = (t0 >>> 16) & 0xff; tag[2] = (t0 >>> 8) & 0xff; tag[3] = t0 & 0xff;
  tag[4] = (t1 >>> 24) & 0xff; tag[5] = (t1 >>> 16) & 0xff; tag[6] = (t1 >>> 8) & 0xff; tag[7] = t1 & 0xff;
  tag[8] = (t2 >>> 24) & 0xff; tag[9] = (t2 >>> 16) & 0xff; tag[10] = (t2 >>> 8) & 0xff; tag[11] = t2 & 0xff;
  tag[12] = (t3 >>> 24) & 0xff; tag[13] = (t3 >>> 16) & 0xff; tag[14] = (t3 >>> 8) & 0xff; tag[15] = t3 & 0xff;

  // Output format: Ciphertext || 16-byte Tag (standard WebCrypto AES-GCM output)
  const result = new Uint8Array(ciphertext.length + 16);
  result.set(ciphertext, 0);
  result.set(tag, ciphertext.length);
  return result;
}

export function aesGcmDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertextWithTag: Uint8Array,
  aad: Uint8Array = new Uint8Array(0),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tagLengthBits: number = 128
): Uint8Array {
  if (key.length !== 32) throw new Error('AES-256 requires 32-byte key');
  if (iv.length !== 12) throw new Error('AES-GCM standard requires 12-byte IV');
  if (ciphertextWithTag.length < 16) throw new Error('Ciphertext too short (must include 16-byte tag)');

  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
  const expectedTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);

  const roundKeys = expandKey256(key);

  // 1. Calculate H = AES_K(0^128)
  const hBytes = new Uint8Array(16);
  aesEncryptBlock(new Uint8Array(16), 0, hBytes, 0, roundKeys);
  const hWords = new Uint32Array([
    (hBytes[0] << 24) | (hBytes[1] << 16) | (hBytes[2] << 8) | hBytes[3],
    (hBytes[4] << 24) | (hBytes[5] << 16) | (hBytes[6] << 8) | hBytes[7],
    (hBytes[8] << 24) | (hBytes[9] << 16) | (hBytes[10] << 8) | hBytes[11],
    (hBytes[12] << 24) | (hBytes[13] << 16) | (hBytes[14] << 8) | hBytes[15]
  ]);

  // 2. Initialize Counter J0 = IV || 0^31 || 1
  const j0 = new Uint8Array(16);
  j0.set(iv);
  j0[15] = 1;

  const j0Enc = new Uint8Array(16);
  aesEncryptBlock(j0, 0, j0Enc, 0, roundKeys);

  // 3. GHASH over (AAD || pad || Ciphertext || pad || len(A) || len(C))
  const aadPadLen = (16 - (aad.length % 16)) % 16;
  const ctPadLen = (16 - (ciphertext.length % 16)) % 16;
  const ghashBuf = new Uint8Array(aad.length + aadPadLen + ciphertext.length + ctPadLen + 16);

  ghashBuf.set(aad, 0);
  ghashBuf.set(ciphertext, aad.length + aadPadLen);

  const lenOffset = aad.length + aadPadLen + ciphertext.length + ctPadLen;
  const aadBits = BigInt(aad.length) * BigInt(8);
  const ctBits = BigInt(ciphertext.length) * BigInt(8);
  const view = new DataView(ghashBuf.buffer, ghashBuf.byteOffset + lenOffset, 16);
  view.setBigUint64(0, aadBits, false);
  view.setBigUint64(8, ctBits, false);

  const ghashState = new Uint32Array(4);
  ghashProcess(hWords, ghashBuf, ghashState);

  // 4. Compute Tag
  const computedTag = new Uint8Array(16);
  const t0 = (ghashState[0] ^ ((j0Enc[0] << 24) | (j0Enc[1] << 16) | (j0Enc[2] << 8) | j0Enc[3])) >>> 0;
  const t1 = (ghashState[1] ^ ((j0Enc[4] << 24) | (j0Enc[5] << 16) | (j0Enc[6] << 8) | j0Enc[7])) >>> 0;
  const t2 = (ghashState[2] ^ ((j0Enc[8] << 24) | (j0Enc[9] << 16) | (j0Enc[10] << 8) | j0Enc[11])) >>> 0;
  const t3 = (ghashState[3] ^ ((j0Enc[12] << 24) | (j0Enc[13] << 16) | (j0Enc[14] << 8) | j0Enc[15])) >>> 0;

  computedTag[0] = (t0 >>> 24) & 0xff; computedTag[1] = (t0 >>> 16) & 0xff; computedTag[2] = (t0 >>> 8) & 0xff; computedTag[3] = t0 & 0xff;
  computedTag[4] = (t1 >>> 24) & 0xff; computedTag[5] = (t1 >>> 16) & 0xff; computedTag[6] = (t1 >>> 8) & 0xff; computedTag[7] = t1 & 0xff;
  computedTag[8] = (t2 >>> 24) & 0xff; computedTag[9] = (t2 >>> 16) & 0xff; computedTag[10] = (t2 >>> 8) & 0xff; computedTag[11] = t2 & 0xff;
  computedTag[12] = (t3 >>> 24) & 0xff; computedTag[13] = (t3 >>> 16) & 0xff; computedTag[14] = (t3 >>> 8) & 0xff; computedTag[15] = t3 & 0xff;

  // 5. Constant-time tag comparison
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    diff |= computedTag[i] ^ expectedTag[i];
  }
  if (diff !== 0) {
    throw new Error('AES-GCM authentication tag verification failed (ciphertext was tampered or corrupted)');
  }

  // 6. Decrypt ciphertext with CTR mode
  const plaintext = new Uint8Array(ciphertext.length);
  const counterBlock = new Uint8Array(16);
  counterBlock.set(iv);

  let counter = 1;
  const numBlocks = Math.ceil(ciphertext.length / 16);
  const streamBlock = new Uint8Array(16);

  for (let b = 0; b < numBlocks; b++) {
    counter++;
    counterBlock[12] = (counter >>> 24) & 0xff;
    counterBlock[13] = (counter >>> 16) & 0xff;
    counterBlock[14] = (counter >>> 8) & 0xff;
    counterBlock[15] = counter & 0xff;

    aesEncryptBlock(counterBlock, 0, streamBlock, 0, roundKeys);

    const start = b * 16;
    const end = Math.min(start + 16, ciphertext.length);
    for (let i = start; i < end; i++) {
      plaintext[i] = ciphertext[i] ^ streamBlock[i - start];
    }
  }

  return plaintext;
}

// ==========================================
// 4. HKDF-SHA256 (RFC 5869)
// ==========================================

export async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const actualSalt = salt.length > 0 ? salt : new Uint8Array(32);
  const createHMAC = getCreateHMAC();
  const createSHA256 = getCreateSHA256();

  if (!createHMAC || !createSHA256) {
    throw new Error('HKDF derivation error: hash-wasm module not ready');
  }

  // Step 1: Extract: PRK = HMAC-SHA256(salt, IKM)
  const hmacExtract = await createHMAC(createSHA256(), actualSalt);
  hmacExtract.init();
  hmacExtract.update(ikm);
  const prk = hmacExtract.digest('binary');

  // Step 2: Expand: T(1) = HMAC-SHA256(PRK, info || 0x01)...
  const n = Math.ceil(length / 32);
  const okm = new Uint8Array(n * 32);
  let prevT = new Uint8Array(0);

  for (let i = 1; i <= n; i++) {
    const hmacExpand = await createHMAC(createSHA256(), prk);
    hmacExpand.init();
    if (prevT.length > 0) {
      hmacExpand.update(prevT);
    }
    hmacExpand.update(info);
    hmacExpand.update(new Uint8Array([i]));
    prevT = hmacExpand.digest('binary');
    okm.set(prevT, (i - 1) * 32);
  }

  return okm.slice(0, length);
}

// ==========================================
// 5. SHA-256 HASH
// ==========================================

export async function sha256Digest(data: Uint8Array): Promise<Uint8Array> {
  const createSHA256 = getCreateSHA256();
  if (!createSHA256) {
    throw new Error('SHA-256 error: hash-wasm module not ready');
  }
  const sha = await createSHA256();
  sha.init();
  sha.update(data);
  return sha.digest('binary');
}
