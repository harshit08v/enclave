import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Shield, Lock, Bug, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export const metadata = {
  title: 'Security Vulnerability Disclosure · ENCLAVE Legal Center',
  description: 'Guidelines for security researchers conducting vulnerability discovery, responsible disclosure timelines, and safe harbor rules.'
};

const TOC = [
  { id: 'disclosure-philosophy', title: 'Responsible Disclosure Philosophy' },
  { id: 'safe-harbor', title: 'Safe Harbor for Security Researchers' },
  { id: 'scope-boundaries', title: 'In-Scope & Out-of-Scope Targets' },
  { id: 'submission-guidelines', title: 'How to Submit a Vulnerability Report' },
  { id: 'triage-remediation', title: 'Assessment & Remediation Targets' },
  { id: 'coordinated-disclosure', title: 'Coordinated Public Disclosure' },
  { id: 'security-contact', title: 'Security Desk Contact' }
];

const RELATED = [
  {
    title: 'Security & Encryption Policy',
    href: '/legal/security',
    description: 'Cryptographic specifications and mathematical assumptions of ENCLAVE.'
  },
  {
    title: 'Acceptable Use Policy',
    href: '/legal/acceptable-use',
    description: 'Prohibited abusive activities and network integrity rules.'
  },
  {
    title: 'Contact & Privacy Requests',
    href: '/legal/contact',
    description: 'Verified channels for official security correspondence.'
  }
];

export default function SecurityDisclosurePage() {
  return (
    <LegalDocumentLayout
      title="Security Vulnerability Disclosure"
      subtitle="The formal framework for coordinated vulnerability reporting, researcher safe harbor protections, and responsible disclosure timelines."
      category="Security"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Philosophy */}
      <section id="disclosure-philosophy" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Responsible Disclosure Philosophy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is dedicated to delivering resilient, zero-knowledge cryptographic communication tools. We deeply appreciate the security research community&apos;s contributions to finding and responsibly reporting vulnerabilities. We commit to working with researchers collaboratively and transparently.
        </p>
      </section>

      {/* 2. Safe Harbor */}
      <section id="safe-harbor" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Safe Harbor for Security Researchers
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          If you conduct research in good faith and in compliance with this policy:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Researcher Protections</span>
          </div>
          <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-2">
            <li>• We consider your security research activities authorized and lawful.</li>
            <li>• We will not initiate legal action against you under anti-hacking statutes (such as the IT Act, 2000, or CFAA).</li>
            <li>• We will work with you to understand, validate, and remediate the issue promptly.</li>
          </ul>
        </div>
      </section>

      {/* 3. Scope */}
      <section id="scope-boundaries" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. In-Scope & Out-of-Scope Targets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>In-Scope Research Targets</span>
            </h3>
            <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-1.5 list-disc pl-4">
              <li>Cryptographic engine (<code className="text-[11px]">packages/crypto</code>)</li>
              <li>Protocol framing & sequence validation (<code className="text-[11px]">packages/protocol</code>)</li>
              <li>Room relay and presence APIs (<code className="text-[11px]">/api/rooms/*</code>)</li>
              <li>Client Web application and authentication stores</li>
            </ul>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Out-of-Scope & Prohibited</span>
            </h3>
            <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-1.5 list-disc pl-4">
              <li>Denial of Service (DoS/DDoS) and network packet flooding</li>
              <li>Social engineering, phishing, or physical intrusion</li>
              <li>Accessing, modifying, or retaining other users&apos; communication data</li>
              <li>Automated volume scanning causing service degradation</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Submission Guidelines */}
      <section id="submission-guidelines" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. How to Submit a Vulnerability Report
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Please submit detailed vulnerability findings to <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">security@enclave.chat</code> including:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Vulnerability Summary:</strong> Description of the issue, root cause, and potential security impact.</li>
          <li><strong>Step-by-Step Reproduction:</strong> Clear steps or minimal proof-of-concept (PoC) code to reproduce the issue.</li>
          <li><strong>Affected Versions/Files:</strong> Specific code paths or endpoints involved.</li>
          <li><strong>Suggested Remediation:</strong> Any technical recommendations for resolving the vulnerability.</li>
        </ul>
      </section>

      {/* 5. Triage & Remediation */}
      <section id="triage-remediation" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Assessment & Remediation Targets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Phase</th>
                <th className="p-3">Target Timeline</th>
                <th className="p-3">Action Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Initial Acknowledgement</td>
                <td className="p-3">Within 24 to 48 hours</td>
                <td className="p-3">Confirm receipt and assign security tracking ticket.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Technical Triage</td>
                <td className="p-3">Within 3 to 5 business days</td>
                <td className="p-3">Validate vulnerability and assign CVSS severity rating.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Patch & Deployment</td>
                <td className="p-3">Within 14 to 30 calendar days</td>
                <td className="p-3">Engineer fix, execute test suites, and deploy to production.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Coordinated Disclosure */}
      <section id="coordinated-disclosure" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Coordinated Public Disclosure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We request that researchers allow a <strong>minimum 60-day coordinated disclosure window</strong> from the date of submission before publishing advisories or technical write-ups, giving our team sufficient time to deploy verified patches to all users.
        </p>
      </section>

      {/* 7. Security Contact */}
      <section id="security-contact" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Security Desk Contact
        </h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Primary Security Channel:</strong> security@enclave.chat</div>
          <div><strong className="text-[var(--text-primary)]">Subject Format:</strong> [VULN REPORT] &lt;Component&gt; - &lt;Brief Description&gt;</div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
