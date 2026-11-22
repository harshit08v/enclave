'use client';

import React, { useState } from 'react';

export default function SecurityArchitectureSection() {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);

  const layers = [
    {
      num: '01',
      name: 'IDENTITY',
      title: 'Local Client Entropy',
      spec: 'CSPRNG + WebCrypto SubtleCrypto',
      desc: 'Entropy is drawn from device hardware random number generators to create unique cryptographic salts and nonces.',
      guarantee: 'Zero entropy predictability across room sessions.'
    },
    {
      num: '02',
      name: 'ACCESS',
      title: 'Out-of-Band Access Pass',
      spec: 'Argon2id (m=32MB, t=3, p=1) + 128-bit Salt',
      desc: 'The out-of-band access pass derives key wrapping keys and a one-way Auth Commitment hash for verification.',
      guarantee: 'The relay server never learns the plaintext pass.'
    },
    {
      num: '03',
      name: 'KEYS',
      title: 'Volatile Runtime Session',
      spec: 'Non-Extractable CryptoKey Handles in Memory',
      desc: 'Keys are imported into runtime memory closures. They are never written to disk, IndexedDB, or local storage.',
      guarantee: 'Zero residual key artifacts after browser window closure.'
    },
    {
      num: '04',
      name: 'ENCRYPTION',
      title: 'Authenticated Payload Framing',
      spec: 'AES-256-GCM + 96-bit Unique IV + 128-bit Polyval MAC',
      desc: 'Every message generates a fresh 96-bit IV nonce. The authentication tag rejects any bit flipping or forgery.',
      guarantee: 'Replay-resistant and tamper-evident packet exchange.'
    },
    {
      num: '05',
      name: 'TRANSPORT',
      title: 'Blind Message Forwarding',
      spec: 'Stateless In-Memory Relay Router',
      desc: 'The server acts as an untrusted message broker, forwarding binary frames without database persistence or indexing.',
      guarantee: 'Cloud snapshots and relay compromises yield zero cleartext.'
    },
    {
      num: '06',
      name: 'DESTRUCTION',
      title: 'Definitive Termination & Purging',
      spec: 'Zeroization upon final participant departure',
      desc: 'When participant count reaches zero, memory buffers are overwritten with random noise and the room is retired.',
      guarantee: 'Permanent forward privacy with zero archival recovery.'
    }
  ];

  const selectedLayer = layers[selectedLayerIndex];

  return (
    <section className="py-24 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>07 / ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.1]">
            Security is an architecture, not a badge.
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            We enforce mathematical boundaries across six independent layers. Click any layer to inspect its formal specifications.
          </p>
        </div>

        {/* Flat Stacked Horizontal Architecture Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Stack of 6 Horizontal Layers */}
          <div className="lg:col-span-7 space-y-2.5">
            {layers.map((layer, idx) => {
              const isSelected = selectedLayerIndex === idx;

              return (
                <button
                  key={layer.num}
                  onClick={() => setSelectedLayerIndex(idx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs font-mono ${isSelected ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-muted)]'}`}>
                      {layer.num}
                    </span>
                    <div>
                      <div className={`text-xs font-mono font-semibold tracking-wider ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                        {layer.name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {layer.title}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-muted)]'}`}>
                    Layer {layer.num}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layer Detail Card */}
          <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-7 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">
                <span>LAYER {selectedLayer.num} SPECIFICATION</span>
                <span className="text-[var(--accent)] font-semibold">{selectedLayer.name}</span>
              </div>
              <h3 className="text-xl font-mono font-semibold text-[var(--text-primary)]">
                {selectedLayer.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-2">
                {selectedLayer.desc}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[var(--text-muted)] uppercase">
                Cryptographic Primitive / Standard
              </div>
              <div className="text-xs text-[var(--text-primary)] font-semibold break-words">
                {selectedLayer.spec}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[var(--accent)] uppercase font-semibold">
                Security Guarantee
              </div>
              <div className="text-xs text-[var(--text-primary)] font-medium">
                {selectedLayer.guarantee}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>VERIFIED PROTOCOL</span>
              <span className="text-[var(--accent)] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>AUDITED MODEL</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
