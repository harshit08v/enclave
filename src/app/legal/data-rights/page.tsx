import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { UserCheck, Trash2, KeyRound, Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Account Deletion & Statutory Rights | ENCLAVE',
  description: 'Procedures for executing self-service account deletion, exercising statutory rights, and data rectification under DPDP Act & international laws.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/data-rights',
  },
};

const TOC = [
  { id: 'rights-overview', title: 'Statutory Data Rights Overview' },
  { id: 'self-service-deletion', title: 'Self-Service Account Deletion Workflow' },
  { id: 'technical-impact', title: 'Technical Impact of Account Erasure' },
  { id: 'access-rectification', title: 'Exercising Access & Rectification Rights' },
  { id: 'nomination-rights', title: 'Right to Nominate (DPDP Act)' },
  { id: 'manual-requests', title: 'Submitting Formal Privacy Petitions' }
];

const RELATED = [
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'Complete disclosures regarding personal data categories and minimization.'
  },
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    description: 'Technical retention windows and automated memory reaper schedules.'
  },
  {
    title: 'Cookie & Storage Policy',
    href: '/legal/cookies',
    description: 'Audit of client localStorage tokens and manual browser clearing instructions.'
  }
];

export default function DataRightsPage() {
  return (
    <LegalDocumentLayout
      title="Account Deletion & Data Rights"
      subtitle="How to exercise your statutory privacy rights, manage profile identity, and execute complete self-service account deletion in ENCLAVE."
      category="User Rights"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Rights Overview */}
      <section id="rights-overview" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Statutory Data Rights Overview
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Under the <strong className="text-[var(--text-primary)]">Digital Personal Data Protection Act, 2023 (India)</strong> and equivalent international data protection frameworks, you have specific, enforceable rights as a Data Principal:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-[var(--text-secondary)]">
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Right of Access</span>
            <p>Obtain confirmation whether your personal data is being processed, along with a summary of stored account records.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Right to Correction</span>
            <p>Correct, update, or complete misleading or outdated account details (display name or email address).</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Right to Erasure</span>
            <p>Demand complete deletion and zeroization of your account profile and associated local session tokens.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Right of Grievance Redressal</span>
            <p>Access designated grievance redressal mechanisms to resolve concerns regarding data handling practices.</p>
          </div>
        </div>
      </section>

      {/* 2. Self-Service Deletion */}
      <section id="self-service-deletion" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Self-Service Account Deletion Workflow
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE provides an instant, self-service account deletion tool directly inside your user settings:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4 shadow-xs">
          <ol className="text-xs font-mono space-y-3 text-[var(--text-secondary)] pl-4 list-decimal leading-relaxed">
            <li>Log into your account and open the <Link href="/app/profile" className="text-[var(--accent)] underline font-medium">Profile & Settings</Link> console.</li>
            <li>Scroll to the <strong>Danger Zone</strong> section at the bottom of the page.</li>
            <li>Click <strong>&quot;Delete Account Permanently&quot;</strong> and confirm the prompt.</li>
          </ol>
          <div className="pt-2">
            <Link
              href="/app/profile"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-mono font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
            >
              <span>Open Profile Settings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Technical Impact */}
      <section id="technical-impact" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Technical Impact of Account Erasure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          When account deletion is executed:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Local Browser Storage Zeroization:</strong> The authentication object (<code className="text-xs bg-[var(--surface-muted)] px-1 py-0.5 rounded">enclave_auth_user</code>), session lists (<code className="text-xs bg-[var(--surface-muted)] px-1 py-0.5 rounded">enclave_active_sessions</code>), and password hash tokens are removed.</li>
          <li><strong>Session Invalidation:</strong> All active device tokens are invalidated immediately.</li>
          <li><strong>Zero Remnant Data:</strong> Because ENCLAVE does not retain historical chat transcripts or room logs on servers, no residual message records persist following account erasure.</li>
        </ul>
      </section>

      {/* 4. Access & Rectification */}
      <section id="access-rectification" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Exercising Access & Rectification Rights
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You can inspect and rectify your personal information directly:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Display Name:</strong> Update your public pseudonym at any time in Profile settings.</li>
          <li><strong>Email Address:</strong> Initiate an email change request in Profile settings; a 15-minute verification token will confirm ownership of the new address.</li>
          <li><strong>Password & Sessions:</strong> Rotate passwords or revoke active secondary device sessions via the Security Center.</li>
        </ul>
      </section>

      {/* 5. Nomination Rights */}
      <section id="nomination-rights" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Right to Nominate (DPDP Act)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Under Section 14 of the Digital Personal Data Protection Act, 2023, you have the right to nominate an individual who shall, in the event of death or incapacity, exercise your data protection rights. To register a nomination, contact our privacy desk with your registered account credentials and designated nominee details.
        </p>
      </section>

      {/* 6. Manual Requests */}
      <section id="manual-requests" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Submitting Formal Privacy Petitions
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          For manual privacy inquiries or grievance submissions:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Email:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Grievance Officer:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Resolution Timeline:</strong> Addressed within statutory deadlines (maximum 30 days).</div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
