'use client';

import React, { useState } from 'react';
import { Mail, Copy, Check, Clock, Shield, Sparkles } from 'lucide-react';

interface CategoryOption {
  id: string;
  label: string;
  subject: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'privacy',
    label: 'Privacy & personal data',
    subject: 'ENCLAVE — Privacy & Personal Data Enquiry'
  },
  {
    id: 'security',
    label: 'Security vulnerability report',
    subject: 'ENCLAVE — Security Vulnerability Report'
  },
  {
    id: 'account',
    label: 'Account or access issue',
    subject: 'ENCLAVE — Account or Access Issue'
  },
  {
    id: 'legal',
    label: 'Legal enquiry',
    subject: 'ENCLAVE — Legal Enquiry'
  },
  {
    id: 'general',
    label: 'General support',
    subject: 'ENCLAVE — General Support Enquiry'
  }
];

const OFFICIAL_EMAIL = 'enclave.support.legal@gmail.com';

const EMAIL_BODY_TEMPLATE = `Hello ENCLAVE Privacy & Legal Team,

My query is:

[Describe your query here]

Thank you.`;

export default function ContactDeskCard() {
  const [selectedCategory, setSelectedCategory] = useState<string>('privacy');
  const [copied, setCopied] = useState<boolean>(false);

  const activeCategory = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  const mailtoUrl = `mailto:${OFFICIAL_EMAIL}?subject=${encodeURIComponent(
    activeCategory.subject
  )}&body=${encodeURIComponent(EMAIL_BODY_TEMPLATE)}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(OFFICIAL_EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div
      id="contact-desk"
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface)] to-[var(--background)] p-6 sm:p-8 shadow-sm transition-all"
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative space-y-6">
        {/* Header Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-1 text-xs font-mono text-[var(--accent)]">
            <Shield className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-semibold">Direct Desk</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Contact Privacy & Legal Desk
          </h2>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Have a privacy concern, legal question, security report, or general query about ENCLAVE? Our team is here to help.
          </p>
        </div>

        {/* Query Category Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Select enquiry topic (customizes subject line):
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    isSelected
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs font-semibold'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Email Address Display with Copy Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--accent)]">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                Official Support & Legal Desk
              </div>
              <div className="font-mono text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate selection:bg-[var(--accent)] selection:text-white">
                {OFFICIAL_EMAIL}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-xs font-mono text-[var(--text-primary)] hover:bg-[var(--border)] hover:border-[var(--text-secondary)] active:scale-[0.98] transition-all shrink-0"
            aria-label="Copy official email address to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>

        {/* Primary CTA Button & 12-hour Commitment */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1 border-t border-[var(--border)]">
          <a
            href={mailtoUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-mono font-medium hover:bg-[var(--accent-hover)] active:scale-[0.99] transition-all shadow-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Email Privacy & Legal Desk</span>
          </a>

          <div className="flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)]">
            <Clock className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>We aim to respond to every enquiry within 12 hours.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
