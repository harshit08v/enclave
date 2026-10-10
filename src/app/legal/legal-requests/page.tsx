import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Scale, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Lock, EyeOff } from 'lucide-react';

export const metadata = {
  title: 'Law Enforcement & Legal Requests · ENCLAVE Legal Center',
  description: 'Operational guidelines and mathematical boundaries for handling governmental, court, and law enforcement inquiries regarding ENCLAVE.'
};

const TOC = [
  { id: 'operational-philosophy', title: 'Operational & Legal Philosophy' },
  { id: 'statutory-standards', title: 'Statutory Standards & Jurisdictional Review' },
  { id: 'technical-capabilities', title: 'Technical Capabilities & Cryptographic Limits' },
  { id: 'data-availability-matrix', title: 'Data Availability Matrix' },
  { id: 'emergency-requests', title: 'Emergency & Exigent Circumstances' },
  { id: 'user-notification', title: 'User Notification Policy' },
  { id: 'service-of-process', title: 'Official Service of Legal Process' }
];

const RELATED = [
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'Overview of minimal personal data processing and privacy protections.'
  },
  {
    title: 'Security & Encryption Policy',
    href: '/legal/security',
    description: 'Cryptographic architecture and zero-knowledge mathematical boundaries.'
  },
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    description: 'In-memory ephemeral retention schedules and zero-remnant room purging.'
  }
];

export default function LegalRequestsPage() {
  return (
    <LegalDocumentLayout
      title="Law Enforcement & Legal Requests"
      subtitle="The operational framework, statutory review process, and mathematical boundaries governing governmental and judicial inquiries."
      category="Legal"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Philosophy */}
      <section id="operational-philosophy" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Operational & Legal Philosophy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is committed to upholding the rule of law while rigorously defending user privacy and fundamental rights. We evaluate every government, court, and law enforcement request on a case-by-case basis. We demand strict adherence to constitutional due process, statutory authority, and proportionality.
        </p>
      </section>

      {/* 2. Statutory Standards */}
      <section id="statutory-standards" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Statutory Standards & Jurisdictional Review
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Before complying with any legal demand:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Statutory Authority:</strong> Requests must be issued under valid statutory provisions by an authorized court or designated investigative authority (e.g. Section 91 of the Code of Criminal Procedure / Bharatiya Nagarik Suraksha Sanhita, or Section 69 of the Information Technology Act, 2000 in India).</li>
          <li><strong>Jurisdictional Validity:</strong> Non-domestic law enforcement agencies must proceed through recognized diplomatic channels, such as Mutual Legal Assistance Treaties (MLAT) or letters rogatory.</li>
          <li><strong>Scope Minimization:</strong> We challenge vague, overbroad, procedurally defective, or unconstitutional legal requests in competent judicial forums.</li>
        </ul>
      </section>

      {/* 3. Technical Capabilities */}
      <section id="technical-capabilities" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Technical Capabilities & Cryptographic Limits
        </h2>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--accent)]" />
            <span>Mathematical Inpossibility of Decryption</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            ENCLAVE is engineered as a <strong className="text-[var(--text-primary)]">zero-knowledge, end-to-end encrypted relay</strong>. Decryption keys are derived exclusively in client browsers via Argon2id and HKDF-SHA256. ENCLAVE does not possess private keys, master keys, or backdoor mechanisms.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-semibold">
            We cannot produce unencrypted message text, decrypted images, or private keys under any circumstances because we do not have access to them.
          </p>
        </div>
      </section>

      {/* 4. Availability Matrix */}
      <section id="data-availability-matrix" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Data Availability Matrix
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The following table transparently delineates what information may be technically available versus what is mathematically impossible to produce:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Category of Information</th>
                <th className="p-3">Availability Status</th>
                <th className="p-3">Technical Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Unencrypted Message Text</td>
                <td className="p-3 text-red-600 dark:text-red-400 font-semibold">NEVER AVAILABLE</td>
                <td className="p-3">Client-side AES-256-GCM encryption; keys never sent to server.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Decrypted Media / Photos / Video</td>
                <td className="p-3 text-red-600 dark:text-red-400 font-semibold">NEVER AVAILABLE</td>
                <td className="p-3">Media keys derived client-side; server stores only opaque encrypted chunks in RAM.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Historical Chat Transcripts</td>
                <td className="p-3 text-red-600 dark:text-red-400 font-semibold">NEVER AVAILABLE</td>
                <td className="p-3">Zero disk storage; volatile RAM packets destroyed immediately upon room exit.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Active Room Metadata</td>
                <td className="p-3 text-amber-600 dark:text-amber-400 font-semibold">TRANSIENT (ACTIVE ONLY)</td>
                <td className="p-3">Room ID, salt, and public auth commitment (accessible only while room is open in RAM).</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Ephemeral Rate-Limit Records</td>
                <td className="p-3 text-amber-600 dark:text-amber-400 font-semibold">TRANSIENT (5 MIN WINDOW)</td>
                <td className="p-3">In-memory IP attempt counter; automatically wiped after 5 minutes of inactivity.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Emergency Requests */}
      <section id="emergency-requests" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Emergency & Exigent Circumstances
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          In cases involving imminent threats to life, serious physical injury, or kidnapping, law enforcement may submit an emergency disclosure request. Such requests are expedited and reviewed immediately for statutory compliance. However, emergency requests remain subject to the absolute mathematical constraints of our E2EE architecture.
        </p>
      </section>

      {/* 6. User Notification */}
      <section id="user-notification" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. User Notification Policy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE’s policy is to notify affected users of legal demands for their data prior to disclosure, unless prohibited by a lawful court gag order or statutory non-disclosure requirement. Where a gag order expires, we provide retroactive notice where technically feasible.
        </p>
      </section>

      {/* 7. Service of Process */}
      <section id="service-of-process" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Official Service of Legal Process
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          All formal legal inquiries, subpoenas, and court orders must be submitted by authorized law enforcement personnel to:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Dedicated Legal Mailbox:</strong> legal@enclave.chat</div>
          <div><strong className="text-[var(--text-primary)]">Subject Format:</strong> [LEGAL PROCESS] &lt;Issuing Agency / Case Number&gt;</div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
