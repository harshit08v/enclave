'use client';

import React, { useMemo } from 'react';

// Lightweight, pure TypeScript QR Code Model 2 generator (Zero runtime dependencies)
// Supports byte mode with Error Correction Level M for robust scanning across phones.

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  fgColor?: string;
  bgColor?: string;
}

// Galois field tables for Reed-Solomon encoding (GF 2^8 with primitive polynomial 0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const res = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return res;
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, GF_EXP[i]]));
  }
  return poly;
}

function calculateECC(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  const ecc = new Uint8Array(ecCount);
  for (let k = 0; k < ecCount; k++) {
    ecc[k] = res[data.length + k];
  }
  return ecc;
}

// QR Table for Versions 1 to 5 (ECL M)
const QR_SPECS: { [v: number]: { totalBytes: number; ecBytes: number; dataBytes: number; size: number } } = {
  1: { totalBytes: 26, ecBytes: 10, dataBytes: 16, size: 21 },
  2: { totalBytes: 44, ecBytes: 16, dataBytes: 28, size: 25 },
  3: { totalBytes: 70, ecBytes: 26, dataBytes: 44, size: 29 },
  4: { totalBytes: 100, ecBytes: 36, dataBytes: 64, size: 33 },
  5: { totalBytes: 134, ecBytes: 48, dataBytes: 86, size: 37 }
};

export function generateQrMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  // Pick version
  let version = 1;
  while (version <= 5) {
    const spec = QR_SPECS[version];
    // Mode indicator (4 bits) + Character count indicator (8 bits for V1-9) + data length
    const totalDataBits = 4 + 8 + textBytes.length * 8;
    if (Math.ceil(totalDataBits / 8) <= spec.dataBytes) break;
    version++;
  }
  if (version > 5) version = 5;

  const spec = QR_SPECS[version];
  const size = spec.size;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Function to place 7x7 Finder Pattern with 1px separator
  const placeFinder = (startX: number, startY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          const isOuter = dx === 0 || dx === 6 || dy === 0 || dy === 6;
          const isInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          const isBox = (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6);
          matrix[y][x] = isBox ? (isOuter || isInner) : false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  matrix[4 * version + 9][8] = true;

  // Alignment pattern for V2+
  if (version >= 2) {
    const pos = size - 7;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        matrix[pos + dy][pos + dx] = dist === 2 || dist === 0;
      }
    }
  }

  // Encode data bits
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(textBytes.length, 8); // Character count
  for (const b of textBytes) pushBits(b, 8);

  // Terminator (up to 4 bits)
  const maxBits = spec.dataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to multiple of 8
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes 0xEC, 0x11
  let padToggle = false;
  while (bits.length < maxBits) {
    pushBits(padToggle ? 0x11 : 0xec, 8);
    padToggle = !padToggle;
  }

  // Convert to data bytes
  const dataBytes = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < spec.dataBytes; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    dataBytes[i] = b;
  }

  // Compute Error Correction
  const ecBytes = calculateECC(dataBytes, spec.ecBytes);

  // Final codeword stream
  const finalStream: number[] = [];
  for (let i = 0; i < dataBytes.length; i++) pushBitsToArr(dataBytes[i], 8, finalStream);
  for (let i = 0; i < ecBytes.length; i++) pushBitsToArr(ecBytes[i], 8, finalStream);

  function pushBitsToArr(val: number, len: number, arr: number[]) {
    for (let i = len - 1; i >= 0; i--) arr.push((val >> i) & 1);
  }

  // Place codewords in matrix (Right to left 2-columns zigzag)
  let bitIndex = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const y of rows) {
      for (let x = right; x > right - 2; x--) {
        if (matrix[y][x] === null) {
          const bit = bitIndex < finalStream.length ? finalStream[bitIndex++] : 0;
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          const mask = (y + x) % 2 === 0;
          matrix[y][x] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // Format Information (ECL M (00) + Mask 0 (000) => 0b00000 with BCH code 101010000010010 XOR 101010000010010 => 0b101010000010010)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Top left
  const formatCoordsTL = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8],
    [2, 8], [1, 8], [0, 8]
  ];
  formatCoordsTL.forEach(([x, y], idx) => {
    matrix[y][x] = formatBits[idx] === 1;
  });

  // Bottom left & Top right
  const formatCoordsRest = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4], [8, size - 5], [8, size - 6], [8, size - 7],
    [size - 8, 8], [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8], [size - 3, 8], [size - 2, 8], [size - 1, 8]
  ];
  formatCoordsRest.forEach(([x, y], idx) => {
    matrix[y][x] = formatBits[idx] === 1;
  });

  return matrix.map(row => row.map(cell => cell === true));
}

export function QrCode({
  value,
  size = 180,
  className = '',
  fgColor = 'currentColor',
  bgColor = 'transparent'
}: QrCodeProps) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  const count = matrix.length;
  const cellSize = 100 / count;

  return (
    <div
      className={`inline-block p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        shapeRendering="crispEdges"
        aria-label={`QR Code for ${value}`}
        role="img"
      >
        <rect width="100" height="100" fill={bgColor} />
        {matrix.map((row, y) =>
          row.map((cell, x) => {
            if (!cell) return null;
            return (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fgColor}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

export default QrCode;
