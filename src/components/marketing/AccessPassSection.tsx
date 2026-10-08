'use client';

import React, { useState } from 'react';

export default function AccessPassSection() {
  const [converged, setConverged] = useState(false);

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Text Explanation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
              <span>03 / DUAL CHANNEL</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
              A link isn&apos;t enough.
            </h2>

            <div className="space-y-4 text-base text-[#666666] leading-relaxed">
              <p>
                Conventional chat applications bundle access directly into a single URL. If that link is stored in browser history, scraped by preview crawlers, or intercepted on a clipboard, the conversation is exposed.
              </p>
              <p className="text-[#111111] font-medium">
                Every ENCLAVE room requires an independent access pass.
              </p>
              <p>
                The pass is never included in the URL. This requires two independent pieces of information sent across two separate communication mediums.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] space-y-1.5 text-xs font-mono text-[#174A3A]">
              <div className="font-semibold uppercase tracking-wider">
                Protocol Specification
              </div>
              <p className="leading-relaxed text-[#111111]">
                The access pass is never included in query parameters (<code className="text-[#174A3A] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#C9DDD5]">?pass=...</code>), URL paths, or server access logs.
              </p>
            </div>
          </div>

          {/* Right: Technical Monochrome + Green Dual-Channel Diagram */}
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E4E4DF] pb-4 text-xs font-mono">
              <span className="text-[#8A8A8A] uppercase tracking-wider">
                Channel Verification
              </span>
              <button
                onClick={() => setConverged(!converged)}
                className="text-[#174A3A] hover:underline font-semibold cursor-pointer"
              >
                {converged ? 'Reset Diagram' : 'Simulate Key Derivation'}
              </button>
            </div>

            {/* Split Visual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Channel 1 */}
              <div className="p-4 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] space-y-2">
                <div className="text-[11px] font-mono text-[#8A8A8A] uppercase tracking-wider">
                  Channel 1: Public Link
                </div>
                <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#E4E4DF] text-xs font-mono text-[#111111] truncate">
                  https://enclave.app/r/a9f2-c801
                </div>
                <div className="text-[11px] text-[#8A8A8A] font-mono">
                  Public room identifier only
                </div>
              </div>

              {/* Channel 2 */}
              <div className={`p-4 rounded-lg border transition-colors space-y-2 ${
                converged ? 'bg-[#E7F0EC] border-[#C9DDD5]' : 'bg-[#FAFAF8] border-[#E4E4DF]'
              }`}>
                <div className="text-[11px] font-mono text-[#174A3A] uppercase tracking-wider font-semibold">
                  Channel 2: Access Pass
                </div>
                <div className="p-2.5 rounded bg-[#FFFFFF] border border-[#C9DDD5] text-xs font-mono text-[#174A3A] font-bold truncate">
                  monolith-silence-zenith-cipher
                </div>
                <div className="text-[11px] text-[#666666] font-mono">
                  Shared out-of-band via separate channel
                </div>
              </div>
            </div>

            {/* Formula Convergence Box */}
            <div className={`p-5 rounded-lg border space-y-3 font-mono text-xs transition-colors ${
              converged ? 'bg-[#E7F0EC] border-[#C9DDD5]' : 'bg-[#FAFAF8] border-[#E4E4DF]'
            }`}>
              <div className="flex items-center justify-between text-[#8A8A8A] border-b border-[#E4E4DF] pb-2 text-[11px]">
                <span className="text-[#666666]">MATHEMATICAL DERIVATION</span>
                <span className={converged ? "text-[#174A3A] font-bold" : "text-[#8A8A8A]"}>
                  {converged ? "KEY DERIVED · ACCESS GRANTED" : "AWAITING FACTORS"}
                </span>
              </div>

              <div className="p-3 bg-[#FFFFFF] rounded border border-[#E4E4DF] text-[#111111] space-y-1">
                <div className="text-[11px] text-[#8A8A8A]">
                  ROOM LINK + ACCESS PASS = <span className="text-[#174A3A] font-bold">ACCESS</span>
                </div>
                <div className="text-xs font-semibold text-[#111111]">
                  {converged
                    ? "PBKDF2-HMAC-SHA256(passphrase, salt) → AES-256-GCM Session Key Unwrapped"
                    : "Neither factor alone grants access to the room or ciphertexts."}
                </div>
              </div>

              <p className="text-[11px] text-[#666666] leading-relaxed font-sans pt-1">
                {converged
                  ? "The client verified the Auth Commitment hash locally, unwrapped the Room Master Secret in volatile memory, and unlocked the room."
                  : "Both independent factors are required to derive session keys on the client."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
