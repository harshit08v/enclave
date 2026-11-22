'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTASection() {
  return (
    <section className="py-28 relative overflow-hidden bg-[var(--background)] border-t border-[var(--border)] flex items-center justify-center text-center">
      <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>PRIVATE COMMUNICATION</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-serif italic font-normal tracking-tight text-[var(--text-primary)] leading-[1.08] text-balance">
          Give your conversations a place to exist. <br />
          <span className="text-[var(--text-secondary)] font-normal not-italic font-sans text-3xl sm:text-5xl block mt-2">
            Not a place to accumulate.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          Create an Enclave in seconds. Set your access pass. Converse without leaving a trail.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
            <Link href="/signup" className="flex items-center space-x-2">
              <span>START CHATTING</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>

          <Button asChild variant="secondary" size="lg" className="border-[var(--border-strong)]">
            <Link href="/security" className="flex items-center space-x-2">
              <span>EXPLORE SECURITY</span>
            </Link>
          </Button>
        </div>

        <div className="pt-8 text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          <span>End-to-end encrypted · Ephemeral by design · No permanent chat history</span>
        </div>
      </div>
    </section>
  );
}
