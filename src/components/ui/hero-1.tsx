'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Hero1Props {
  className?: string;
}

export function Hero1({ className }: Hero1Props) {
  return (
    <section
      className={cn(
        "relative flex flex-col justify-center items-center text-center px-6 pt-24 sm:pt-28 pb-16 sm:pb-20 overflow-hidden bg-[#FAFAF8]",
        className
      )}
    >
      {/* Subtle Grid Background Pattern */}
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

      {/* Subtle Atmospheric Warm Gradient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#E7F0EC]/50 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center space-y-6 sm:space-y-7">
        {/* Brand Emblem */}
        <div className="animate-fade-in relative mb-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(23,74,58,0.18)] dark:shadow-[0_8px_30px_rgba(94,155,130,0.22)] border border-[#C9DDD5] dark:border-[#254438] bg-[#0c120f] transition-transform hover:scale-105 duration-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="ENCLAVE — Ephemeral Private Encrypted Communication Logo Emblem"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Eyebrow with Deep Forest Green Accent */}
        <div className="animate-fade-in inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-widest text-[#174A3A] uppercase font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
          <span>PRIVATE COMMUNICATION, REIMAGINED</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up text-5xl sm:text-7xl lg:text-8xl font-medium tracking-tight text-[#111111] leading-[1.04] text-balance">
          Private by design. <br />
          <span className="text-[#8A8A8A] font-normal">Gone when you leave.</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up text-lg sm:text-xl text-[#666666] max-w-2xl font-normal leading-relaxed text-balance">
          ENCLAVE gives conversations a place to exist — and a deliberate way to end.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
            <Link href="/signup" className="flex items-center justify-center space-x-2.5">
              <span>START CHATTING</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
            <Link href="/security" className="flex items-center justify-center space-x-2">
              <span>EXPLORE SECURITY</span>
            </Link>
          </Button>
        </div>

        {/* Trust Line with Deep Forest Green Accent Dot */}
        <div className="animate-fade-up pt-5 border-t border-[#E4E4DF] flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono text-[#8A8A8A]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>End-to-end encrypted</span>
          </span>
          <span>·</span>
          <span>Ephemeral by design</span>
          <span>·</span>
          <span>No permanent chat history</span>
        </div>
      </div>
    </section>
  );
}

export default Hero1;
