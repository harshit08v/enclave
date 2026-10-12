import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-[var(--background)] border-t border-[var(--border)] pt-16 pb-12 text-[var(--text-secondary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[var(--border)]">
          {/* Brand Info */}
          <div className="md:col-span-4 space-y-3">
            <BrandLogo size="md" showTagline={true} />
            <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Private by design. Gone when you leave. A private room for conversations that don&apos;t need to remain.
            </p>
            <div className="text-xs font-mono text-[var(--text-muted)] pt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>End-to-end encrypted · Ephemeral by design · Zero permanent retention</span>
            </div>
          </div>

          {/* Group 1: ENCLAVE Architecture */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              ENCLAVE
            </div>
            <ul className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/about" className="hover:text-[var(--accent)] transition-colors">
                  About ENCLAVE
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[var(--accent)] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-[var(--accent)] transition-colors">
                  Security & Encryption
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-[var(--accent)] transition-colors">
                  Workspace Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 2: LEGAL */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              Legal
            </div>
            <ul className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/legal" className="hover:text-[var(--accent)] font-medium text-[var(--text-primary)] transition-colors">
                  Legal Center
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[var(--accent)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-[var(--accent)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-[var(--accent)] transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/acceptable-use" className="hover:text-[var(--accent)] transition-colors">
                  Acceptable Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 3: PRIVACY & SAFETY */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              Privacy & Safety
            </div>
            <ul className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/legal/data-retention" className="hover:text-[var(--accent)] transition-colors">
                  Data Retention & Deletion
                </Link>
              </li>
              <li>
                <Link href="/legal/data-rights" className="hover:text-[var(--accent)] transition-colors">
                  Account Deletion & Rights
                </Link>
              </li>
              <li>
                <Link href="/legal/security-disclosure" className="hover:text-[var(--accent)] transition-colors">
                  Security Disclosure
                </Link>
              </li>
              <li>
                <Link href="/legal/legal-requests" className="hover:text-[var(--accent)] transition-colors">
                  Law Enforcement Requests
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 4: SUPPORT */}
          <div className="md:col-span-2 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
              Support
            </div>
            <ul className="space-y-2 text-xs font-mono text-[var(--text-secondary)]">
              <li>
                <Link href="/legal/contact" className="hover:text-[var(--accent)] transition-colors">
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link href="/legal/copyright" className="hover:text-[var(--accent)] transition-colors">
                  Copyright & Takedown
                </Link>
              </li>
              <li>
                <Link href="/app/profile" className="hover:text-[var(--accent)] transition-colors">
                  Security Center
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[var(--text-muted)] gap-4">
          <div>
            © {new Date().getFullYear()} ENCLAVE. Private by Design. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-[var(--text-muted)]">
            <Link href="/legal" className="hover:text-[var(--accent)] transition-colors">
              Legal Center
            </Link>
            <span>·</span>
            <span>Zero server plaintext retention</span>
            <span>·</span>
            <span className="text-[var(--accent)] font-medium">AES-256-GCM + Argon2id</span>
          </div>
        </div>

        {/* MAVQORA Attribution */}
        <div className="pt-4 border-t border-[var(--border)] text-center text-xs font-mono text-[var(--text-muted)]">
          Designed and developed by{' '}
          <a
            href="https://mavqora.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors font-medium underline underline-offset-4"
          >
            MAVQORA
          </a>
        </div>
      </div>
    </footer>
  );
}
