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
    <section className="py-24 border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>08 / TECHNICAL HONESTY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.1]">
            Security has boundaries.
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            ENCLAVE protects communication in transit and while stored within the system according to its cryptographic design. We do not make impossible promises about physical endpoint security.
          </p>
        </div>

        {/* 4 Explicit Threat Boundary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boundaries.map((b, idx) => (
            <div
              key={idx}
              className="p-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2 hover:border-[var(--accent-border)] transition-colors shadow-xs"
            >
              <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider mb-1 font-semibold">
                Boundary 0{idx + 1}
              </div>
              <h3 className="text-base font-mono font-semibold text-[var(--text-primary)] tracking-tight">
                {b.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Callout */}
        <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="text-sm font-mono font-semibold text-[var(--text-primary)]">
              Privacy is strongest when endpoints are trustworthy.
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Cryptographic tools defend the wire and the courier. Human discretion safeguards the room.
            </div>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent)] font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>FORMAL THREAT BOUNDARY</span>
          </div>
        </div>
      </div>
    </section>
  );
}
