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
      spec: 'PBKDF2-HMAC-SHA256 (100,000 rounds) + 128-bit Salt',
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
      title: 'Definitive Termination & Obliteration',
      spec: 'Zeroization upon final participant departure',
      desc: 'When participant count reaches zero, memory buffers are overwritten with random noise and the room is retired.',
      guarantee: 'Permanent forward privacy with zero archival recovery.'
    }
  ];

  const selectedLayer = layers[selectedLayerIndex];

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>07 / ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            Security is an architecture, not a badge.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
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
                      ? 'bg-[#E7F0EC] border-[#174A3A] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#E4E4DF] hover:border-[#C9DDD5] hover:bg-[#F8FBF9]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs font-mono ${isSelected ? 'text-[#174A3A] font-bold' : 'text-[#8A8A8A]'}`}>
                      {layer.num}
                    </span>
                    <div>
                      <div className={`text-xs font-mono font-semibold tracking-wider ${isSelected ? 'text-[#174A3A]' : 'text-[#111111]'}`}>
                        {layer.name}
                      </div>
                      <div className="text-xs text-[#666666] mt-0.5">
                        {layer.title}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-[#174A3A] font-medium' : 'text-[#8A8A8A]'}`}>
                    Layer {layer.num}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Layer Detail Card */}
          <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-6 sm:p-7 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[#8A8A8A] uppercase tracking-wider mb-2">
                <span>LAYER {selectedLayer.num} SPECIFICATION</span>
                <span className="text-[#174A3A] font-semibold">{selectedLayer.name}</span>
              </div>
              <h3 className="text-xl font-mono font-semibold text-[#111111]">
                {selectedLayer.title}
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed mt-2">
                {selectedLayer.desc}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[#8A8A8A] uppercase">
                Cryptographic Primitive / Standard
              </div>
              <div className="text-xs text-[#111111] font-semibold break-words">
                {selectedLayer.spec}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[#174A3A] uppercase font-semibold">
                Security Guarantee
              </div>
              <div className="text-xs text-[#111111] font-medium">
                {selectedLayer.guarantee}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E4DF] flex items-center justify-between text-[11px] font-mono text-[#8A8A8A]">
              <span>VERIFIED PROTOCOL</span>
              <span className="text-[#174A3A] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
                <span>AUDITED MODEL</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
