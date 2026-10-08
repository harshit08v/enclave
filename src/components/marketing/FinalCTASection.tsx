'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTASection() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#FAFAF8] border-t border-[#E4E4DF] flex items-center justify-center text-center">
      {/* Subtle Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(to right, #E8E8E2 1px, transparent 1px),
            linear-gradient(to bottom, #E8E8E2 1px, transparent 1px)
          `,
          backgroundSize: '6rem 5rem',
        }}
      />

      {/* Subtle Radial Forest Green Gradient */}
      <div className="absolute w-[600px] h-[500px] bg-gradient-to-b from-[#E7F0EC]/60 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
          <span>PRIVATE COMMUNICATION</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08] text-balance">
          Give your conversations a place to exist. <br />
          <span className="text-[#8A8A8A] font-normal">Not a place to accumulate.</span>
        </h2>

        <p className="text-base sm:text-lg text-[#666666] max-w-xl mx-auto leading-relaxed">
          Create an Enclave in seconds. Set your access pass. Converse without leaving a trail.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup" className="flex items-center space-x-2">
              <span>START CHATTING</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button asChild variant="secondary" size="lg">
            <Link href="/security" className="flex items-center space-x-2">
              <span>EXPLORE SECURITY</span>
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-xs font-mono text-[#8A8A8A] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
          <span>End-to-end encrypted · Ephemeral by design · No permanent chat history</span>
        </div>
      </div>
    </section>
  );
}
