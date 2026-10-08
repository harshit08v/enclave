'use client';

import React from 'react';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'CREATE',
      desc: 'Create an Enclave and set an access pass.',
      detail: 'Client generates cryptographic salt and ephemeral session parameters locally via WebCrypto.',
    },
    {
      num: '02',
      title: 'SHARE',
      desc: 'Share the room link and access pass separately.',
      detail: 'Send the public link over one channel and the access pass out-of-band through a secondary medium.',
    },
    {
      num: '03',
      title: 'TALK',
      desc: 'Messages are encrypted before leaving your device.',
      detail: 'AES-256-GCM authenticated payloads with fresh 96-bit IV nonces. The relay operates strictly as a courier.',
    },
    {
      num: '04',
      title: 'LEAVE',
      desc: 'When the final participant leaves, the room ends.',
      detail: 'Memory keys are zeroized, in-transit buffers are dropped, and the room becomes mathematically unreachable.',
    },
  ];

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#F4F4F0]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>02 / HOW IT WORKS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            Four steps. One private room.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            An intentional architecture designed to establish ephemeral trust, ensure client-side confidentiality, and guarantee definitive termination.
          </p>
        </div>

        {/* 4-column Editorial Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between hover:border-[#C9DDD5] hover:bg-[#F8FBF9] transition-all group shadow-xs"
            >
              <div>
                <div className="text-2xl font-mono font-medium text-[#174A3A] mb-6">
                  {step.num}
                </div>

                <h3 className="text-base font-mono font-semibold tracking-wider text-[#111111] mb-2 uppercase">
                  {step.title}
                </h3>

                <p className="text-sm text-[#111111] font-medium leading-snug mb-3">
                  {step.desc}
                </p>

                <p className="text-xs text-[#666666] leading-relaxed">
                  {step.detail}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-[#E4E4DF] flex items-center justify-between text-[10px] font-mono text-[#8A8A8A] uppercase">
                <span>Phase {step.num}</span>
                <span className="text-[#174A3A] font-semibold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#174A3A]" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
