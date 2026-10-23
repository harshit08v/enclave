import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { AlertOctagon, ShieldAlert, Ban, CheckCircle2, FileWarning } from 'lucide-react';

export const metadata = {
  title: 'Acceptable Use Policy | Prohibited Conduct | ENCLAVE',
  description: 'Standards of prohibited conduct, security integrity rules, and abuse enforcement on the ENCLAVE ephemeral platform.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/acceptable-use',
  },
};

const TOC = [
  { id: 'purpose-scope', title: 'Purpose & Scope' },
  { id: 'prohibited-content', title: 'Zero-Tolerance Prohibited Content' },
  { id: 'technical-abuse', title: 'Network & System Abuse' },
  { id: 'e2ee-realities', title: 'Enforcement within E2EE Architecture' },
  { id: 'enforcement-measures', title: 'Enforcement Actions & Sanctions' },
  { id: 'reporting-violations', title: 'Reporting Violations & Inquiries' }
];

const RELATED = [
  {
    title: 'Terms of Service',
    href: '/legal/terms',
    description: 'The master binding contractual agreement governing platform usage.'
  },
  {
    title: 'Security Vulnerability Disclosure',
    href: '/legal/security-disclosure',
    description: 'Rules of engagement for authorized security researchers.'
  },
  {
    title: 'Copyright & Takedown Policy',
    href: '/legal/copyright',
    description: 'Procedures for reporting copyright infringement.'
  }
];

export default function AcceptableUsePolicyPage() {
  return (
    <LegalDocumentLayout
      title="Acceptable Use Policy"
      subtitle="The behavioral standards, network integrity guidelines, and abuse prohibitions required of all ENCLAVE users."
      category="Legal"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Purpose */}
      <section id="purpose-scope" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Purpose & Scope
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE provides private, ephemeral communication infrastructure. To maintain the stability, integrity, and lawful operation of the platform, all users must adhere to this Acceptable Use Policy (&quot;AUP&quot;). Violation of this policy may result in immediate suspension, room termination, and rate-limiting blocks.
        </p>
      </section>

      {/* 2. Prohibited Content */}
      <section id="prohibited-content" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Zero-Tolerance Prohibited Content
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You may not use ENCLAVE to create rooms, upload media, or facilitate conversations involving:
        </p>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-2 text-xs font-mono text-[var(--text-secondary)]">
          <ul className="space-y-2 list-disc pl-4">
            <li><strong>Child Sexual Abuse Material (CSAM):</strong> Production, distribution, or facilitation of child sexual exploitation.</li>
            <li><strong>Terrorism & Violent Extremism:</strong> Coordination of violent acts, terrorism recruitment, or mass harm threats.</li>
            <li><strong>Non-Consensual Intimate Imagery:</strong> Distribution of private imagery without explicit consent.</li>
            <li><strong>Human Trafficking & Extortion:</strong> Facilitating coerced labor, ransom schemes, or blackmail.</li>
          </ul>
        </div>
      </section>

      {/* 3. Technical Abuse */}
      <section id="technical-abuse" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Network & System Abuse
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Users must not abuse our infrastructure or attempt to degrade service reliability for others:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Denial of Service (DoS):</strong> Flooding relay endpoints, opening excessive parallel WebSockets, or packet amplification attacks.</li>
          <li><strong>Malware Distribution:</strong> Attaching executables, malicious scripts, trojans, or ransomware to encrypted file transfers.</li>
          <li><strong>Brute-Force & Credential Stuffing:</strong> Attempting to guess room passphrases, crack auth commitments, or exhaust API limits.</li>
          <li><strong>Scraping & Unauthorized Automation:</strong> Deploying automated bots to scrape public endpoints without written consent.</li>
        </ul>
      </section>

      {/* 4. E2EE Realities */}
      <section id="e2ee-realities" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Enforcement within E2EE Architecture
        </h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-600" />
            <span>Honest Disclosure of Enforcement Boundaries</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Because ENCLAVE employs zero-knowledge client-side encryption, our servers <strong className="text-[var(--text-primary)]">cannot inspect message contents, parse text strings, or analyze media files</strong>. Consequently, ENCLAVE does not employ keyword filtering or automated content moderation algorithms on encrypted payloads.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Enforcement is conducted through network-level anomaly detection, automated rate-limiting thresholds, room destruction triggers, and user-initiated reports.
          </p>
        </div>
      </section>

      {/* 5. Enforcement Actions */}
      <section id="enforcement-measures" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Enforcement Actions & Sanctions
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          When violations of this AUP or network anomalies are detected, ENCLAVE may apply proportionate remedies:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-[var(--text-secondary)]">
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">IP Rate-Limiting</span>
            <p>Automated lockouts for clients exceeding request thresholds.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Room Dissolution</span>
            <p>Immediate termination of abusive or abnormal room sessions.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Account Suspension</span>
            <p>Revocation of account credentials for repeated violations.</p>
          </div>
        </div>
      </section>

      {/* 6. Reporting */}
      <section id="reporting-violations" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Reporting Violations & Inquiries
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          If you observe system abuse, denial-of-service attempts, or platform violations, report the incident to our security desk:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono">
          <div><strong className="text-[var(--text-primary)]">Abuse & Security Desk:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
