'use client';

import React, { useState } from 'react';

export default function EphemeralSection() {
  const [hoveredState, setHoveredState] = useState<'ACTIVE' | 'ENDING' | 'DESTROYING' | 'DESTROYED'>('ACTIVE');

  const states = [
    {
      key: 'ACTIVE' as const,
      num: '01',
      title: 'ACTIVE',
      badgeColor: 'bg-[#E7F0EC] text-[#174A3A] border-[#C9DDD5]',
      desc: 'Participants present. End-to-end encrypted session active in RAM.',
      detail: 'Memory keys stored in non-extractable CryptoKey handles.'
    },
    {
      key: 'ENDING' as const,
      num: '02',
      title: 'ENDING',
      badgeColor: 'bg-[#F4F4F0] text-[#666666] border-[#E4E4DF]',
      desc: 'First participant leaves. Departure protocol armed.',
      detail: 'Departure signal dispatched to remaining sockets.'
    },
    {
      key: 'DESTROYING' as const,
      num: '03',
      title: 'DESTROYING',
      badgeColor: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
      desc: 'Final participant leaves. Zeroization protocol triggers.',
      detail: 'Key references dropped, session memory overwritten.'
    },
    {
      key: 'DESTROYED' as const,
      num: '04',
      title: 'DESTROYED',
      badgeColor: 'bg-[#F4F4F0] text-[#8A8A8A] border-[#E4E4DF]',
      desc: 'Room obliterated. Non-recoverable tombstone status.',
      detail: 'Room ID retired permanently. Re-entry impossible.'
    }
  ];

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#F4F4F0]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>06 / EPHEMERAL LIFECYCLE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            Every room has an ending.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            When the final participant leaves, the room enters its definitive dissolution sequence. Key handles are wiped and the chamber ceases to exist.
          </p>
        </div>

        {/* Clean Editorial Lifecycle State Visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {states.map((st) => {
            const isSelected = hoveredState === st.key;

            return (
              <div
                key={st.key}
                onMouseEnter={() => setHoveredState(st.key)}
                className={`p-6 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#174A3A] shadow-xs'
                    : 'bg-[#FFFFFF] border-[#E4E4DF] hover:border-[#C9DDD5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-[#8A8A8A]">{st.num}</span>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border font-medium ${st.badgeColor}`}>
                      {st.key}
                    </span>
                  </div>

                  <h3 className="text-lg font-mono font-semibold tracking-wider text-[#111111] mb-2 uppercase">
                    {st.title}
                  </h3>

                  <p className="text-xs text-[#666666] leading-relaxed mb-3">
                    {st.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E4E4DF] text-[11px] font-mono text-[#8A8A8A]">
                  {st.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Narrative Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-2">
            <div className="text-xs font-mono uppercase text-[#174A3A] font-semibold tracking-wider">
              Definitive Inaccessibility
            </div>
            <p className="text-sm text-[#666666] leading-relaxed">
              When the final participant leaves, the room URL becomes inactive. No administrator or participant can revive, reconstruct, or view past ciphertexts.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-2">
            <div className="text-xs font-mono uppercase text-[#174A3A] font-semibold tracking-wider">
              Presence-First Architecture
            </div>
            <p className="text-sm text-[#666666] leading-relaxed">
              ENCLAVE treats human conversation like spoken dialogue: temporary, contextual, and gone once the conversation concludes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
