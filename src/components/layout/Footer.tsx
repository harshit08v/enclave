import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--background)] border-t border-[var(--border)] pt-16 pb-12 text-[var(--text-secondary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[var(--border)]">
          {/* Brand Info */}
          <div className="md:col-span-6 space-y-3">
            <span className="font-mono text-sm font-semibold tracking-widest text-[var(--text-primary)]">
              ENCLAVE
            </span>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Private by design. Gone when you leave. A private room for conversations that don&apos;t need to remain.
            </p>
            <div className="text-xs font-mono text-[var(--text-muted)] pt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>End-to-end encrypted · Ephemeral by design · No permanent chat history</span>
            </div>
          </div>

          {/* Architecture Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              Architecture
            </div>
            <ul className="space-y-2.5 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/how-it-works" className="hover:text-[var(--accent)] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-[var(--accent)] transition-colors">
                  Security Model
                </Link>
              </li>
              <li>
                <Link href="/security#threat-model" className="hover:text-[var(--accent)] transition-colors">
                  Threat Model & Scope
                </Link>
              </li>
              <li>
                <Link href="/security#cryptography" className="hover:text-[var(--accent)] transition-colors">
                  Cryptographic Primitives
                </Link>
              </li>
            </ul>
          </div>

          {/* Product & About */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              Product
            </div>
            <ul className="space-y-2.5 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/app/new" className="hover:text-[var(--accent)] transition-colors">
                  Create Room
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-[var(--accent)] transition-colors">
                  Workspace
                </Link>
              </li>
              <li>
                <Link href="/app/profile" className="hover:text-[var(--accent)] transition-colors">
                  Profile & Settings
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[var(--accent)] transition-colors">
                  Manifesto
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[var(--accent)] transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[var(--text-muted)] gap-4">
          <div>
            © {new Date().getFullYear()} ENCLAVE. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-[var(--text-muted)]">
            <span>Zero server plaintext retention</span>
            <span>·</span>
            <span className="text-[var(--accent)] font-medium">AES-256-GCM + Argon2id</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
