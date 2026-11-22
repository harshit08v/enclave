'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Terminal, Cpu, Lock, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Hero1Props {
  className?: string;
}

export function Hero1({ className }: Hero1Props) {
  return (
    <section
      className={cn(
        "relative px-6 pt-28 sm:pt-36 pb-16 sm:pb-24 bg-[var(--background)] overflow-hidden",
        className
      )}
    >
      {/* Precision Engineering Top Metadata Strip */}
      <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-[var(--text-muted)] border-b border-[var(--border)] pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="font-semibold text-[var(--text-primary)]">PROTOCOL SPEC NO. 2026-ENC</span>
            <span className="text-[var(--border-strong)]">/</span>
            <span>REVISION 5.3</span>
          </div>

          <div className="hidden sm:flex items-center space-x-4">
            <span>WEB-CRYPTO SUBTLE ENGINE</span>
            <span className="text-[var(--border-strong)]">/</span>
            <span>ZERO PERSISTENT DISK</span>
            <span className="text-[var(--border-strong)]">/</span>
            <span className="text-[var(--accent)] font-semibold">EPHEMERAL RAM LIFECYCLE</span>
          </div>
        </div>
      </div>

      {/* Main Editorial Hero Composition */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column: Bold Editorial Typography & Primary Actions */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-sm bg-[var(--surface-muted)] border border-[var(--border)] text-[10px] sm:text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span>PAIRWISE EPHEMERAL CHAMBERS</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif italic font-normal tracking-tight text-[var(--text-primary)] leading-[1.04] text-balance">
              Conversations that dissolve without an echo.
            </h1>

            <p className="text-base sm:text-xl text-[var(--text-secondary)] font-normal leading-relaxed max-w-2xl text-balance">
              ENCLAVE establishes zero-knowledge, end-to-end encrypted rooms that exist exclusively in volatile browser memory and transient relay buffers. No phone numbers, no persistent chat databases, and absolute cryptographic memory zeroization upon departure.
            </p>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Button
                asChild
                size="lg"
                className="px-8 h-12 text-xs font-mono tracking-wider font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.99] transition-all"
              >
                <Link href="/app/new" className="flex items-center justify-center space-x-2.5">
                  <span>INITIALIZE A PRIVATE CHAMBER</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-6 h-12 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)] transition-all"
              >
                <Link href="/security" className="flex items-center justify-center space-x-2">
                  <span>INSPECT THREAT MODEL</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </Link>
              </Button>
            </div>

            {/* Hardware & Spec Badges */}
            <div className="pt-6 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono text-[var(--text-secondary)]">
              <div className="space-y-1">
                <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">CRYPTOGRAPHY</div>
                <div className="font-semibold text-[var(--text-primary)]">Signal Double Ratchet</div>
                <div className="text-[11px] text-[var(--text-muted)]">AES-256-GCM + X25519</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">RETENTION MODEL</div>
                <div className="font-semibold text-[var(--accent)]">Zero Persistent Database</div>
                <div className="text-[11px] text-[var(--text-muted)]">Volatile Redis · 1h Max TTL</div>
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-1">
                <div className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">GUEST ONBOARDING</div>
                <div className="font-semibold text-[var(--text-primary)]">Instant Out-of-Band</div>
                <div className="text-[11px] text-[var(--text-muted)]">Zero Account · Name &amp; Pass Only</div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Telemetry Card (Physical Hardware / Lab aesthetic) */}
          <div className="lg:col-span-4 w-full">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] text-xs font-mono">
                <span className="uppercase text-[var(--text-muted)] tracking-wider">CHAMBER TELEMETRY</span>
                <span className="inline-flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <span>ONLINE // IDLE</span>
                </span>
              </div>

              {/* Architectural Parameters Spec Ledger */}
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Room Master Secret</span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">256-bit CSPRNG</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Client Key Derivation</span>
                  <span className="text-[var(--text-primary)] font-mono">Argon2id (m=32MB)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Frame Nonce Scope</span>
                  <span className="text-[var(--text-primary)] font-mono">Fresh 96-bit IV</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                  <span className="text-[var(--text-muted)]">Channel Separation</span>
                  <span className="text-[var(--accent)] font-semibold font-mono">Strict 2-Channel</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[var(--text-muted)]">RAM Zeroization</span>
                  <span className="text-[var(--accent)] font-semibold font-mono">Atomic on Exit</span>
                </div>
              </div>

              {/* Real-time Code Diagnostic Block */}
              <div className="pt-2">
                <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-md p-3 font-mono text-[11px] text-[var(--text-secondary)] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>MEMORY_INVARIANT.C</span>
                    <span>VERIFIED</span>
                  </div>
                  <div className="text-[10px] text-[var(--accent)] leading-relaxed font-mono">
                    crypto.getRandomValues(salt_128);<br />
                    window.crypto.subtle.deriveKey(...);<br />
                    window.addEventListener(&apos;beforeunload&apos;, wipe);
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed pt-1">
                Zero telemetry or analytics cookies are stored on guest endpoints. Transmissions are routed strictly over TLS 1.3 with client-side payload encryption.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero1;
