'use client';

import React from 'react';

export default function E2EESection() {
  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#F4F4F0]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>04 / CRYPTOGRAPHY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            The server is the courier. Not the listener.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            Your conversation leaves your device encrypted. The server acts as a neutral transport courier routing opaque binary packets.
          </p>
        </div>

        {/* Clean Editorial Technical Pipeline Diagram */}
        <div className="bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-8 sm:p-12 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            {/* Step 1: Device A */}
            <div className="p-5 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] text-center space-y-2">
              <div className="text-xs font-mono text-[#8A8A8A] uppercase tracking-wider">
                Origin
              </div>
              <div className="text-sm font-mono font-semibold text-[#111111]">
                YOUR DEVICE
              </div>
              <div className="text-xs text-[#666666]">
                Plaintext generation in volatile memory
              </div>
            </div>

            {/* Step 2: Encrypt (Deep Forest Green) */}
            <div className="flex flex-col items-center justify-center space-y-1 py-2 font-mono">
              <span className="text-xs text-[#174A3A] font-bold">
                ENCRYPT
              </span>
              <span className="text-[10px] text-[#174A3A] bg-[#E7F0EC] px-2 py-0.5 rounded border border-[#C9DDD5]">
                AES-256-GCM
              </span>
              <span className="text-xs text-[#174A3A]">→</span>
            </div>

            {/* Step 3: Server Relay (Neutral) */}
            <div className="p-6 rounded-lg bg-[#F4F4F0] border border-[#D5D5CE] text-center space-y-2">
              <div className="text-xs font-mono text-[#8A8A8A] uppercase tracking-wider">
                Neutral Relay
              </div>
              <div className="text-sm font-mono font-semibold text-[#111111]">
                SERVER
              </div>
              <div className="text-xs font-mono text-[#666666] break-all">
                7f a2 91 c4 88 ...
              </div>
              <div className="text-[10px] font-mono text-[#8A8A8A] pt-1">
                Zero keys · Zero logs
              </div>
            </div>

            {/* Step 4: Decrypt (Deep Forest Green) */}
            <div className="flex flex-col items-center justify-center space-y-1 py-2 font-mono">
              <span className="text-xs text-[#174A3A] font-bold">
                DECRYPT
              </span>
              <span className="text-[10px] text-[#174A3A] bg-[#E7F0EC] px-2 py-0.5 rounded border border-[#C9DDD5]">
                Auth Tag Verified
              </span>
              <span className="text-xs text-[#174A3A]">→</span>
            </div>

            {/* Step 5: Recipient */}
            <div className="p-5 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] text-center space-y-2">
              <div className="text-xs font-mono text-[#8A8A8A] uppercase tracking-wider">
                Destination
              </div>
              <div className="text-sm font-mono font-semibold text-[#111111]">
                RECIPIENT
              </div>
              <div className="text-xs text-[#666666]">
                Decrypted only after MAC tag verification
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-[#E4E4DF] text-xs font-mono text-[#8A8A8A] text-center max-w-2xl mx-auto leading-relaxed">
            The relay cannot inspect message contents, alter binary payloads, or forge messages on behalf of participants.
          </div>
        </div>
      </div>
    </section>
  );
}
