'use client';

import React, { useState, useEffect } from 'react';

export default function ServerCourierSection() {
  const [activePacketIndex, setActivePacketIndex] = useState(0);

  const sampleMessages = [
    {
      plaintext: "Hey, are you free tonight?",
      hexCipher: "7f a2 91 c4 88 e1 9d 02 4a 1b 3f",
      iv: "e8 12 a0 99 b1",
      tag: "5c 44 d9 20"
    },
    {
      plaintext: "The contract draft is finalized in room 8f92.",
      hexCipher: "3d 90 f8 22 c1 a4 77 19 8c e0 45",
      iv: "b4 92 11 c8 30",
      tag: "1a 9f 33 8e"
    },
    {
      plaintext: "Closing discussion now. Room self-destructs.",
      hexCipher: "c4 18 9b 72 0f 63 da 88 e2 39 50",
      iv: "4f 80 c7 12 d3",
      tag: "9e 21 b6 70"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePacketIndex((prev) => (prev + 1) % sampleMessages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [sampleMessages.length]);

  const activeMsg = sampleMessages[activePacketIndex];

  return (
    <section className="py-24 border-t border-[#E4E4DF] bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>05 / RELAY BOUNDARY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111] leading-[1.1]">
            What the relay sees.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            The infrastructure only ever handles opaque ciphertext packets. The server cannot read conversation content, build profiling graphs, or inspect message bodies.
          </p>
        </div>

        {/* Minimal Packet Contrast Panel */}
        <div className="bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-6 sm:p-10 space-y-8 shadow-xs">
          {/* Packet Flow Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E4DF] pb-4 text-xs font-mono">
            <div className="flex items-center space-x-2 text-[#111111] font-medium">
              <span>DEVICE A</span>
              <span className="text-[#8A8A8A]">→</span>
              <span className="bg-[#F4F4F0] border border-[#E4E4DF] px-2 py-0.5 rounded text-[#111111]">SERVER RELAY</span>
              <span className="text-[#8A8A8A]">→</span>
              <span>DEVICE B</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center gap-1.5 text-[#174A3A] font-semibold bg-[#E7F0EC] px-2.5 py-0.5 rounded border border-[#C9DDD5] text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
                <span>ENCRYPTED</span>
              </span>
              <span className="text-[#8A8A8A]">
                PACKET {activePacketIndex + 1} OF {sampleMessages.length}
              </span>
            </div>
          </div>

          {/* Side by Side Contrast */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Sees */}
            <div className="p-6 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#111111] font-semibold uppercase tracking-wider">
                  SERVER SEES
                </span>
                <span className="text-[10px] text-[#8A8A8A] uppercase">
                  Opaque Ciphertext
                </span>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#E4E4DF] rounded text-xs space-y-2 text-[#111111]">
                <div className="text-[#666666] text-[11px]">Payload Frame:</div>
                <div className="text-xs font-semibold tracking-wider break-all text-[#111111]">
                  {activeMsg.hexCipher} ...
                </div>
                <div className="text-[10px] text-[#8A8A8A] flex justify-between pt-1 border-t border-[#E4E4DF]">
                  <span>IV: {activeMsg.iv}</span>
                  <span>MAC: {activeMsg.tag}</span>
                </div>
              </div>

              <p className="text-xs text-[#666666] font-sans leading-relaxed">
                Raw binary noise. Without the out-of-band access pass, these bytes are mathematically indistinguishable from random data.
              </p>
            </div>

            {/* Server Does NOT See */}
            <div className="p-6 rounded-lg bg-[#FAFAF8] border border-[#E4E4DF] space-y-4 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8A8A8A] font-semibold uppercase tracking-wider line-through">
                  SERVER DOES NOT SEE
                </span>
                <span className="text-[10px] text-[#8A8A8A] uppercase">
                  Zero Plaintext
                </span>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#E4E4DF] rounded text-xs space-y-2">
                <div className="text-[#8A8A8A] text-[11px]">Human Plaintext:</div>
                <div className="text-xs text-[#8A8A8A] italic">
                  &ldquo;{activeMsg.plaintext}&rdquo;
                </div>
                <div className="text-[10px] text-[#8A8A8A] pt-1 border-t border-[#E4E4DF]">
                  Decrypted exclusively on recipient endpoint
                </div>
              </div>

              <p className="text-xs text-[#666666] font-sans leading-relaxed">
                Plaintext exists exclusively inside device memory closures and is never transmitted over the network or stored in cloud disks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
