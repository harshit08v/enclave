'use client';

import React, { useState } from 'react';

export default function AccessPassSection() {
  const [converged, setConverged] = useState(false);

  return (
    <section className="py-24 border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Text Explanation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 text-xs font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>03 / DUAL CHANNEL</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.1]">
              A link isn&apos;t enough.
            </h2>

            <div className="space-y-4 text-base text-[var(--text-secondary)] leading-relaxed">
              <p>
                Conventional chat applications bundle access directly into a single URL. If that link is stored in browser history, scraped by preview crawlers, or intercepted on a clipboard, the conversation is exposed.
              </p>
              <p className="text-[var(--text-primary)] font-medium">
                Every ENCLAVE room requires an independent access pass.
              </p>
              <p>
                The pass is never included in the URL. This requires two independent pieces of information sent across two separate communication mediums.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] space-y-1.5 text-xs font-mono text-[var(--accent)]">
              <div className="font-semibold uppercase tracking-wider">
                Protocol Specification
              </div>
              <p className="leading-relaxed text-[var(--text-primary)]">
                The access pass is never included in query parameters (<code className="text-[var(--accent)] bg-[var(--surface)] px-1 py-0.5 rounded border border-[var(--accent-border)]">?pass=...</code>), URL paths, or server access logs.
              </p>
            </div>
          </div>

          {/* Right: Technical Monochrome + Green Dual-Channel Diagram */}
          <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 text-xs font-mono">
              <span className="text-[var(--text-muted)] uppercase tracking-wider">
                Channel Verification
              </span>
              <button
                onClick={() => setConverged(!converged)}
                className="text-[var(--accent)] hover:underline font-semibold cursor-pointer"
              >
                {converged ? 'Reset Diagram' : 'Simulate Key Derivation'}
              </button>
            </div>

            {/* Split Visual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Channel 1 */}
              <div className="p-4 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
                <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  Channel 1: Public Link
                </div>
                <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] truncate">
                  https://enclave.app/r/a9f2-c801
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  Public room identifier only
                </div>
              </div>

              {/* Channel 2 */}
              <div className={`p-4 rounded-lg border transition-colors space-y-2 ${
                converged ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]' : 'bg-[var(--surface-muted)] border-[var(--border)]'
              }`}>
                <div className="text-[11px] font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">
                  Channel 2: Access Pass
                </div>
                <div className="p-2.5 rounded bg-[var(--surface)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent)] font-bold truncate">
                  monolith-silence-zenith-cipher
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                  Shared out-of-band via separate channel
                </div>
              </div>
            </div>

            {/* Formula Convergence Box */}
            <div className={`p-5 rounded-lg border space-y-3 font-mono text-xs transition-colors ${
              converged ? 'bg-[var(--accent-soft)] border-[var(--accent-border)]' : 'bg-[var(--surface-muted)] border-[var(--border)]'
            }`}>
              <div className="flex items-center justify-between text-[var(--text-muted)] border-b border-[var(--border)] pb-2 text-[11px]">
                <span className="text-[var(--text-secondary)]">MATHEMATICAL DERIVATION</span>
                <span className={converged ? "text-[var(--accent)] font-bold" : "text-[var(--text-muted)]"}>
                  {converged ? "KEY DERIVED · ACCESS GRANTED" : "AWAITING FACTORS"}
                </span>
              </div>

              <div className="p-3 bg-[var(--surface)] rounded border border-[var(--border)] text-[var(--text-primary)] space-y-1">
                <div className="text-[11px] text-[var(--text-muted)]">
                  ROOM LINK + ACCESS PASS = <span className="text-[var(--accent)] font-bold">ACCESS</span>
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {converged
                    ? "Argon2id(passphrase, salt) → AES-256-GCM Session Key Unwrapped"
                    : "Neither factor alone grants access to the room or ciphertexts."}
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans pt-1">
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
