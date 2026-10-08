'use client';

import React from 'react';

export default function HonestSecuritySection() {
  const boundaries = [
    {
      title: 'Physical Photography & Display Recording',
      desc: 'An external optical camera aimed at a physical display cannot be prevented mathematically.'
    },
    {
      title: 'Operating System Screenshots',
      desc: 'If a user captures their OS window buffer before room dissolution, cryptography cannot retroactively wipe that file.'
    },
    {
      title: 'Manual Transcription & Copying',
      desc: 'An authorized participant in the conversation can intentionally copy or transcribe text prior to departing.'
    },
    {
      title: 'Malicious Extensions & Endpoint Malware',
      desc: 'If a device is infected with browser extension keyloggers or OS trojans, encryption secures the network, not the compromised machine.'
    }
  ];

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#F4F4F0]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>08 / TECHNICAL HONESTY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            Security has boundaries.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            ENCLAVE protects communication in transit and while stored within the system according to its cryptographic design. We do not make impossible promises about physical endpoint security.
          </p>
        </div>

        {/* 4 Explicit Threat Boundary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boundaries.map((b, idx) => (
            <div
              key={idx}
              className="p-7 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-2 hover:border-[#C9DDD5] transition-colors shadow-xs"
            >
              <div className="text-xs font-mono text-[#174A3A] uppercase tracking-wider mb-1 font-semibold">
                Boundary 0{idx + 1}
              </div>
              <h3 className="text-base font-mono font-semibold text-[#111111] tracking-tight">
                {b.title}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Callout */}
        <div className="p-6 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="text-sm font-mono font-semibold text-[#111111]">
              Privacy is strongest when endpoints are trustworthy.
            </div>
            <div className="text-xs text-[#666666]">
              Cryptographic tools defend the wire and the courier. Human discretion safeguards the room.
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#E7F0EC] border border-[#C9DDD5] text-xs font-mono text-[#174A3A] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>FORMAL THREAT BOUNDARY</span>
          </div>
        </div>
      </div>
    </section>
  );
}
