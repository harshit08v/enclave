import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Mail, Shield, AlertTriangle, FileText, CheckCircle2, Clock, Lock } from 'lucide-react';

export const metadata = {
  title: 'Contact & Privacy Requests · ENCLAVE Legal Center',
  description: 'Verified channels and instructions for submitting data rights requests, security disclosures, and legal notices to ENCLAVE.'
};

const TOC = [
  { id: 'channels', title: 'Designated Communication Channels' },
  { id: 'privacy-requests', title: 'Submitting a Data Rights Request' },
  { id: 'verification-process', title: 'Proportionate Identity Verification' },
  { id: 'timelines', title: 'Response Timelines & Resolution Targets' },
  { id: 'grievance-officer', title: 'Grievance Redressal (India / IT Rules)' },
  { id: 'security-reports', title: 'Security Vulnerability Reports' },
  { id: 'legal-notices', title: 'Official Legal Notices & Court Orders' }
];

const RELATED = [
  {
    title: 'Account Deletion & Data Rights',
    href: '/legal/data-rights',
    description: 'Guide to exercising statutory privacy rights and self-service account deletion.'
  },
  {
    title: 'Security Vulnerability Disclosure',
    href: '/legal/security-disclosure',
    description: 'Responsible disclosure framework, scope guidelines, and safe harbor terms.'
  },
  {
    title: 'Law Enforcement & Legal Requests',
    href: '/legal/legal-requests',
    description: 'Protocol and technical boundaries for governmental and court requests.'
  }
];

export default function ContactAndRequestsPage() {
  return (
    <LegalDocumentLayout
      title="Contact & Privacy Requests"
      subtitle="Verified communication channels for exercising statutory data protection rights, submitting security findings, and legal inquiries."
      category="User Rights"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Designated Channels */}
      <section id="channels" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Designated Communication Channels
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To ensure timely processing, please direct your correspondence to the appropriate specialized channel:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              <span>Privacy & Data Rights Desk</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              For personal data access, correction, erasure requests, and DPDP Act petitions.
            </p>
            <div className="text-xs font-mono font-medium text-[var(--text-primary)] pt-1">
              privacy@enclave.chat
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              <span>Security & Vulnerability Desk</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              For coordinated vulnerability disclosures, cryptographic assessments, and exploit reports.
            </p>
            <div className="text-xs font-mono font-medium text-[var(--text-primary)] pt-1">
              security@enclave.chat
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Grievance & Compliance Officer</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              For formal statutory grievances under IT Rules and DPDP Rules.
            </p>
            <div className="text-xs font-mono font-medium text-[var(--text-primary)] pt-1">
              grievance@enclave.chat
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>Legal & Law Enforcement Desk</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              For governmental inquiries, court orders, and legal process service.
            </p>
            <div className="text-xs font-mono font-medium text-[var(--text-primary)] pt-1">
              legal@enclave.chat
            </div>
          </div>
        </div>
      </section>

      {/* 2. Submitting Privacy Requests */}
      <section id="privacy-requests" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Submitting a Data Rights Request
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          When submitting a request under data protection laws (such as access, rectification, erasure, or grievance redressal), include:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li>Your registered account email address (if you maintain a registered profile).</li>
          <li>A concise description of the specific right you wish to exercise.</li>
          <li>Any relevant context or timestamps (e.g., date of account creation).</li>
        </ul>
      </section>

      {/* 3. Verification Process */}
      <section id="verification-process" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Proportionate Identity Verification
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          In alignment with privacy minimization principles, ENCLAVE <strong className="text-[var(--text-primary)]">will never request sensitive government IDs or biometric records</strong> to process standard privacy requests. Verification is performed proportionately by confirming control over the registered email address associated with the account.
        </p>
      </section>

      {/* 4. Timelines */}
      <section id="timelines" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Response Timelines & Resolution Targets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Inquiry Category</th>
                <th className="p-3">Initial Acknowledgement Target</th>
                <th className="p-3">Substantive Resolution Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Privacy / Data Erasure Requests</td>
                <td className="p-3">Within 48 hours</td>
                <td className="p-3">Within 30 calendar days</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Statutory User Grievances</td>
                <td className="p-3">Within 24 hours</td>
                <td className="p-3">Within 15 calendar days (per IT Rules)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Security Vulnerability Reports</td>
                <td className="p-3">Within 24-48 hours</td>
                <td className="p-3">Continuous triage; fix rollout within 14-30 days</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Legal & Regulatory Inquiries</td>
                <td className="p-3">Within 24 hours</td>
                <td className="p-3">Prompt compliance in accordance with applicable law</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Grievance Officer */}
      <section id="grievance-officer" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Grievance Redressal (India / IT Rules)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal Data Protection Act, 2023, the designated Grievance Officer for ENCLAVE can be contacted at:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Designation:</strong> Grievance Officer, ENCLAVE Operations</div>
          <div><strong className="text-[var(--text-primary)]">Official Email:</strong> grievance@enclave.chat</div>
          <div><strong className="text-[var(--text-primary)]">Mailing Address:</strong> Available upon verified statutory request via legal desk.</div>
        </div>
      </section>

      {/* 6. Security Reports */}
      <section id="security-reports" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Security Vulnerability Reports
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          For details regarding in-scope assets, safe harbor rules, and formatting security submissions, consult our <a href="/legal/security-disclosure" className="text-[var(--accent)] underline">Security Vulnerability Disclosure Policy</a>.
        </p>
      </section>

      {/* 7. Legal Notices */}
      <section id="legal-notices" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Official Legal Notices & Court Orders
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Official legal process, statutory notices, and judicial communications must be served electronically to <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">legal@enclave.chat</code> accompanied by relevant statutory authorization and judicial seal.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
