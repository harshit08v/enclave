import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { FileText, ShieldCheck, AlertCircle, CheckCircle2, Scale } from 'lucide-react';

export const metadata = {
  title: 'Copyright & Takedown Policy | Intermediary Compliance | ENCLAVE',
  description: 'Procedures for submitting copyright infringement notices, intermediary role clarifications, and takedown workflows for ENCLAVE.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/copyright',
  },
};

const TOC = [
  { id: 'purpose', title: 'Purpose & Overview' },
  { id: 'technical-context', title: 'Technical Architecture & Intermediary Role' },
  { id: 'notice-requirements', title: 'Submitting a Copyright Infringement Notice' },
  { id: 'takedown-procedure', title: 'Review & Action Workflow' },
  { id: 'counter-notice', title: 'Counter-Notification Procedure' },
  { id: 'designated-agent', title: 'Designated Copyright Contact' }
];

const RELATED = [
  {
    title: 'Terms of Service',
    href: '/legal/terms',
    description: 'User ownership of communications and platform licensing terms.'
  },
  {
    title: 'Acceptable Use Policy',
    href: '/legal/acceptable-use',
    description: 'Prohibited activities and enforcement on the ENCLAVE platform.'
  },
  {
    title: 'Contact & Privacy Requests',
    href: '/legal/contact',
    description: 'Official contact channels and legal process service.'
  }
];

export default function CopyrightPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Copyright & Takedown Policy"
      subtitle="The formal process for submitting good-faith intellectual property infringement notices and counter-notifications to ENCLAVE."
      category="Legal"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Purpose */}
      <section id="purpose" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Purpose & Overview
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE respects the intellectual property rights of creators, developers, and rights holders. This policy outlines the procedure for submitting copyright infringement notices regarding publicly accessible materials on our domain, in accordance with applicable copyright laws, including the Indian Copyright Act, 1957, and international notice-and-takedown standards.
        </p>
      </section>

      {/* 2. Technical Context */}
      <section id="technical-context" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Technical Architecture & Intermediary Role
        </h2>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Important Technical Clarification</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            ENCLAVE functions primarily as a <strong className="text-[var(--text-primary)]">transient, zero-knowledge cryptographic relay</strong>. Ephemeral chat rooms exist exclusively in volatile server RAM and automatically self-destruct within minutes. ENCLAVE maintains no permanent database of messages or uploaded files, and our servers cannot decrypt or inspect room communications.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            This takedown policy applies to publicly hosted assets, web documentation, and platform elements under the operator&apos;s direct administrative control.
          </p>
        </div>
      </section>

      {/* 3. Notice Requirements */}
      <section id="notice-requirements" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Submitting a Copyright Infringement Notice
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To file a valid, good-faith copyright notice, please submit an email to our designated contact containing:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Rights Holder Identification:</strong> Name, organization, mailing address, email address, and telephone number.</li>
          <li><strong>Protected Work:</strong> Specific identification and description of the copyrighted work claimed to be infringed.</li>
          <li><strong>Location of Infringing Material:</strong> Specific URL or public asset path on the ENCLAVE domain.</li>
          <li><strong>Good-Faith Statement:</strong> A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.</li>
          <li><strong>Accuracy Declaration:</strong> A statement under penalty of perjury that the information in your notice is accurate and that you are authorized to act on behalf of the owner.</li>
          <li><strong>Signature:</strong> Physical or electronic signature of the authorized representative.</li>
        </ul>
      </section>

      {/* 4. Takedown Workflow */}
      <section id="takedown-procedure" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Review & Action Workflow
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Upon receiving an actionable and complete infringement notice:
        </p>
        <ol className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-decimal leading-relaxed">
          <li>Our legal desk logs and acknowledges the notice within 24 to 48 hours.</li>
          <li>We verify the public location and nature of the identified material.</li>
          <li>If substantiated, the infringing material is promptly removed or disabled from public access.</li>
          <li>We notify any relevant account holder or affected party where applicable.</li>
        </ol>
      </section>

      {/* 5. Counter-Notice */}
      <section id="counter-notice" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Counter-Notification Procedure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          If you believe material you posted was removed in error or as a result of misidentification, you may submit a counter-notification detailing your contact information, the removed material’s location, a statement of good-faith belief under penalty of perjury, and your consent to jurisdiction.
        </p>
      </section>

      {/* 6. Designated Agent */}
      <section id="designated-agent" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Designated Copyright Contact
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          All copyright notices and counter-notifications should be directed to:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Designation:</strong> Copyright & Legal Compliance Desk</div>
          <div><strong className="text-[var(--text-primary)]">Email:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Subject Line:</strong> &quot;Copyright Takedown Notice — Attn: Legal Desk&quot;</div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
