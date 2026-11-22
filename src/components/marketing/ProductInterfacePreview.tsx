'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  FileCode,
  CheckCheck,
  Clock,
  Radio,
  Plus,
  ArrowUp,
  Cpu,
  Layers,
  Terminal,
  FileText
} from 'lucide-react';

export default function ProductInterfacePreview() {
  const [activeTab, setActiveTab] = useState<'chamber' | 'inspector'>('chamber');
  const [viewedMedia, setViewedMedia] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      {/* Outer Software Window Frame */}
      <div className="software-window rounded-xl overflow-hidden border border-[var(--border)] shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-[var(--surface)]">
        {/* 1. Chamber Terminal Control Header */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Window Dots + Chamber Meta */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
            </div>

            <div className="h-3.5 w-px bg-[var(--border)]" />

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[var(--text-muted)]">CHAMBER TERMINAL</span>
              <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">enc-8f4b-21a0</span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                STAGING SPEC
              </span>
            </div>
          </div>

          {/* Right: Mode Selector Tabs (Chamber vs Inspector) */}
          <div className="flex items-center space-x-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('chamber')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'chamber'
                  ? 'bg-[var(--surface)] text-[var(--accent)] font-semibold border border-[var(--border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              01 // Chamber View
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'inspector'
                  ? 'bg-[var(--surface)] text-[var(--accent)] font-semibold border border-[var(--border)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              02 // Wire &amp; Memory Inspector
            </button>
          </div>
        </div>

        {/* Tab 1: Chamber Interactive View */}
        {activeTab === 'chamber' && (
          <div>
            {/* Session Invariants Subheader */}
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--text-secondary)]">
              <div className="flex items-center space-x-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-[var(--text-primary)] font-semibold">2/2 Active Participants</span>
                </span>
                <span>·</span>
                <span>Ratchet: Step 04 (X25519)</span>
                <span>·</span>
                <span>Max TTL: 58m 14s</span>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-[var(--text-muted)]">
                <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>WebCrypto Subtle RAM Only</span>
              </div>
            </div>

            {/* Conversation Canvas */}
            <div className="p-4 sm:p-6 space-y-4 bg-[var(--background)] min-h-[380px] flex flex-col justify-between">
              <div className="space-y-4 max-w-2xl mx-auto w-full">
                {/* Protocol Handshake Marker */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-muted)] px-3 py-1 rounded-sm border border-[var(--border)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span>Double Ratchet Pairwise Session Established · Non-Persisted Memory Key</span>
                  </div>
                </div>

                {/* Peer Message: Counterparty Alice */}
                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--text-muted)] px-1">
                    <span className="font-semibold text-[var(--text-primary)]">Alice</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                      Counterparty
                    </span>
                    <span>·</span>
                    <span>10:42 AM</span>
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl rounded-tl-xs px-4 py-2.5 text-sm text-[var(--text-primary)] max-w-[85%] sm:max-w-md shadow-2xs leading-relaxed">
                    The acquisition covenant and escrow terms are finalized. Transmitting the restricted view-once asset drop now.
                  </div>
                </div>

                {/* View-Once Ephemeral Asset Drop */}
                <div className="flex flex-col items-start space-y-1">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl rounded-tl-xs p-3.5 max-w-[85%] sm:max-w-md shadow-2xs w-full space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent)] shrink-0">
                          <FileText className="w-4 h-4 text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate font-mono">
                            escrow_charter_restricted.pdf
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            {viewedMedia ? 'Decrypted in RAM · Purged' : '1.4 MB · View-Once Protected'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewedMedia(true)}
                        disabled={viewedMedia}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                          viewedMedia
                            ? 'bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] cursor-default'
                            : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-2xs'
                        }`}
                      >
                        {viewedMedia ? 'Purged ✓' : 'Decrypt in RAM'}
                      </button>
                    </div>

                    {viewedMedia && (
                      <div className="p-2 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-[10px] font-mono text-[var(--accent)]">
                        ✓ In-flight ciphertext decrypted in volatile RAM buffer. Memory zeroized on leave.
                      </div>
                    )}
                  </div>
                </div>

                {/* Host Message: Self */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--text-muted)] px-1">
                    <span className="font-semibold text-[var(--accent)]">You</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                      Host
                    </span>
                    <span>·</span>
                    <span>10:43 AM</span>
                  </div>
                  <div className="bg-[var(--accent)] text-white rounded-xl rounded-tr-xs px-4 py-2.5 text-sm max-w-[85%] sm:max-w-md shadow-2xs leading-relaxed">
                    Decrypted and verified against our local ephemeral keys. The moment this chamber closes, all memory buffers dissolve.
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-[var(--text-muted)] pr-1">
                    <span>Forward-Secure</span>
                    <CheckCheck className="w-3 h-3 text-[var(--accent)]" />
                  </div>
                </div>

                {/* Disappearing Timer Notice */}
                <div className="flex items-center justify-center pt-1">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--surface-muted)] px-3 py-1 rounded-sm border border-[var(--border)]">
                    <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Chamber Inactivity Auto-Destruction: 10 minutes · Immediate wipe on tab close</span>
                  </div>
                </div>
              </div>

              {/* Realistic Composer Console */}
              <div className="pt-3 max-w-2xl mx-auto w-full">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 flex items-center justify-between gap-3 shadow-2xs">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
                    aria-label="Add attachment"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <span className="flex-1 text-xs text-[var(--text-muted)] select-none font-sans">
                    Type an end-to-end encrypted message…
                  </span>

                  <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center text-white shadow-2xs">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Wire & Memory Inspector View */}
        {activeTab === 'inspector' && (
          <div className="p-6 bg-[#0D1713] text-[#A4ADA5] font-mono text-xs space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#20332A] text-xs">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-[var(--champagne)]" />
                <span className="font-semibold text-[#EAE8DF]">LIVE PROTOCOL PACKET SERIALIZATION</span>
              </div>
              <span className="text-[10px] text-[var(--champagne)] uppercase tracking-wider">
                CANONICAL AAD + X25519 DH RATCHET
              </span>
            </div>

            {/* Spec Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="bg-[#15231D] p-3.5 rounded-lg border border-[#20332A] space-y-1">
                <div className="text-[10px] text-[#6F7D74] uppercase tracking-wider">NONCE // FRESH CSPRNG IV</div>
                <div className="text-[var(--champagne)] font-mono break-all font-semibold">96-bit 0x7b9a4c1e820f1359aa87d462</div>
                <p className="text-[10px] text-[#A4ADA5]">Generated anew for every frame to eliminate packet replay.</p>
              </div>

              <div className="bg-[#15231D] p-3.5 rounded-lg border border-[#20332A] space-y-1">
                <div className="text-[10px] text-[#6F7D74] uppercase tracking-wider">AUTHENTICATION TAG</div>
                <div className="text-[var(--champagne)] font-mono break-all font-semibold">128-bit 0xf41e0a84b3917d2c0b89a3f2</div>
                <p className="text-[10px] text-[#A4ADA5]">Cryptographically verifies sender identity and prevents tampering.</p>
              </div>

              <div className="bg-[#15231D] p-3.5 rounded-lg border border-[#20332A] space-y-1">
                <div className="text-[10px] text-[#6F7D74] uppercase tracking-wider">FORWARD SECRECY CHAIN</div>
                <div className="text-[var(--champagne)] font-mono break-all font-semibold">Seq: 004 · DH: 91b5…c308</div>
                <p className="text-[10px] text-[#A4ADA5]">Ratchet chain advances monotonically per message.</p>
              </div>
            </div>

            {/* Hex Dump Specimen */}
            <div className="bg-[#15231D] p-4 rounded-lg border border-[#20332A] space-y-2">
              <div className="flex items-center justify-between text-[10px] text-[#6F7D74] uppercase tracking-wider">
                <span>OPAQUE CIPHERTEXT BUFFER (BLIND RELAY SEES ONLY THIS)</span>
                <span>LENGTH: 128 BYTES</span>
              </div>
              <pre className="text-[11px] text-[#EAE8DF] font-mono leading-relaxed overflow-x-auto p-2 bg-[#0D1713] rounded border border-[#1A2E24]">
{`00000000  d7 a8 e5 f2 99 10 4b 6c  80 3e 17 2a 5b 6c 9f 01  |......Kl.>.*[l..|
00000010  8e 3d 4c 7b 2a 9f 10 6e  5d 3c 8b 7a 4f 91 02 e3  |.{*..n]<.zO...|
00000020  b8 a1 c4 d7 e0 f2 93 84  75 a6 b1 c2 d3 e4 f5 a6  |........u.......|
00000030  b7 c8 d9 e0 f1 a2 b3 c4  ec 11 94 a0 bb e2 39 4f  |..............9O|`}
              </pre>
            </div>

            {/* Invariant Explanation */}
            <div className="text-[11px] text-[#A4ADA5] leading-relaxed pt-1">
              Notice: The server couriers only route the opaque ciphertext buffer. Because the Room Master Secret and Double Ratchet keys are never transmitted to or held by the relay, no mathematical possibility exists for the server to log or reconstruct plaintext communications.
            </div>
          </div>
        )}

        {/* 3. Bottom Terminal Status Strip */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2 text-[var(--text-secondary)]">
            <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Volatile Redis Relay · Automatic 1h TTL Expiration · Non-Recoverable Dissolution</span>
          </div>

          <Link
            href="/app/new"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            <span>Launch a Live Chamber</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
