import React from 'react';
import type { Metadata } from 'next';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Scale, CheckCircle2, AlertTriangle, ShieldCheck, FileCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | User Agreement | ENCLAVE',
  description: 'Terms of service and user agreement governing access to and use of the ENCLAVE private ephemeral communication platform.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/terms',
  },
};

const TOC = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'eligibility', title: 'Eligibility & Account Security' },
  { id: 'service-nature', title: 'Ephemeral Architecture & Data Invariants' },
  { id: 'content-ownership', title: 'User Content Ownership & Relay License' },
  { id: 'prohibited-activities', title: 'Prohibited Activities' },
  { id: 'intellectual-property', title: 'Platform Intellectual Property' },
  { id: 'availability-updates', title: 'Service Availability & Modifications' },
  { id: 'termination', title: 'Suspension, Termination & Erasure' },
  { id: 'warranty-disclaimer', title: 'Disclaimer of Warranties' },
  { id: 'liability-limitation', title: 'Limitation of Liability' },
  { id: 'governing-law', title: 'Governing Law & Dispute Resolution' },
  { id: 'contact-changes', title: 'Modifications & Contact' }
];

const RELATED = [
  {
    title: 'Acceptable Use Policy',
    href: '/legal/acceptable-use',
    description: 'Detailed standards of prohibited conduct, automated abuse rules, and security enforcement.'
  },
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'How personal data and operational metadata are handled under strict minimization.'
  },
  {
    title: 'Security & Encryption Policy',
    href: '/legal/security',
    description: 'Cryptographic specifications and mathematical boundaries of our zero-knowledge system.'
  },
  {
    title: 'Copyright & Takedown Policy',
    href: '/legal/copyright',
    description: 'Procedures for submitting intellectual property and copyright notices.'
  }
];

export default function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      subtitle="The binding contractual agreement governing your use of the ENCLAVE privacy-first ephemeral messaging platform."
      category="Legal"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Acceptance */}
      <section id="acceptance" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Acceptance of Terms
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          By accessing or using ENCLAVE (the &quot;Service&quot;), including creating rooms, generating access passes, connecting to encrypted relays, or registering an account, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree with any provision of these Terms, you must immediately cease accessing and using the Service.
        </p>
      </section>

      {/* 2. Eligibility */}
      <section id="eligibility" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Eligibility & Account Security
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to use ENCLAVE. You are solely responsible for maintaining the confidentiality of your credentials, passphrases, and room access links.
        </p>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono text-[var(--text-secondary)] space-y-2">
          <p>• <strong>Access Pass Secrecy:</strong> Room passphrases derive client-side encryption keys via Argon2id. Sharing a room link or passphrase with unauthorized parties exposes your conversation to those individuals.</p>
          <p>• <strong>No Server Recovery:</strong> Because ENCLAVE does not retain plaintext or private keys, lost room passphrases or destroyed rooms cannot be restored or recovered by ENCLAVE personnel.</p>
        </div>
      </section>

      {/* 3. Ephemeral Architecture */}
      <section id="service-nature" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Ephemeral Architecture & Data Invariants
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is specifically designed for <strong className="text-[var(--text-primary)]">temporary, non-persistent communication</strong>. You acknowledge and agree to the following structural characteristics of the Service:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li>Rooms exist in volatile server RAM and automatically dissolve when all participants exit.</li>
          <li>Inactivity timeouts automatically purge idle rooms (e.g., 3-minute waiting timeout, 15-minute active timeout).</li>
          <li>ENCLAVE does not provide permanent cloud message archival, backup retrieval, or message export tools.</li>
        </ul>
      </section>

      {/* 4. Content Ownership */}
      <section id="content-ownership" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. User Content Ownership & Relay License
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You retain all ownership, title, and intellectual property rights in the communications, messages, and media you transmit through ENCLAVE. ENCLAVE claims <strong className="text-[var(--text-primary)]">zero ownership</strong> over your content.
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Solely to the extent necessary to operate the Service, you grant ENCLAVE a strictly limited, non-exclusive, royalty-free, worldwide license to receive, buffer in transient memory, and relay encrypted packets to the designated participants of your room. This license terminates automatically the moment a packet is delivered or the room is dissolved.
        </p>
      </section>

      {/* 5. Prohibited Activities */}
      <section id="prohibited-activities" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Prohibited Activities
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You agree not to use the Service for any unlawful or abusive purpose, including but not limited to:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li>Transmitting child sexual abuse material (CSAM) or facilitating human trafficking.</li>
          <li>Deploying viruses, worms, malware, or malicious code through file attachments.</li>
          <li>Launching denial-of-service (DoS) attacks, automated packet flooding, or unauthorized load testing.</li>
          <li>Attempting to bypass access controls, brute-force room commitments, or exploit API endpoints.</li>
          <li>Violating our <a href="/legal/acceptable-use" className="text-[var(--accent)] underline">Acceptable Use Policy</a>.</li>
        </ul>
      </section>

      {/* 6. Intellectual Property */}
      <section id="intellectual-property" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Platform Intellectual Property
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The ENCLAVE interface, brand marks, logos, visual identity, domain names, and proprietary client code are the exclusive intellectual property of ENCLAVE and its licensors. Open-source packages developed by ENCLAVE are governed by their respective open-source licenses.
        </p>
      </section>

      {/* 7. Service Availability */}
      <section id="availability-updates" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Service Availability & Modifications
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We strive to provide continuous availability but do not guarantee uninterrupted uptime. We reserve the right to modify, upgrade, suspend, or discontinue any aspect of the Service for maintenance, security hardening, or infrastructure updates without liability.
        </p>
      </section>

      {/* 8. Termination */}
      <section id="termination" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          8. Suspension, Termination & Erasure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We reserve the right to suspend or terminate access to the Service for any user who violates these Terms or engages in abusive activities. You may terminate your relationship with ENCLAVE at any time by ceasing use and executing self-service account deletion.
        </p>
      </section>

      {/* 9. Warranty Disclaimer */}
      <section id="warranty-disclaimer" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          9. Disclaimer of Warranties
        </h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider leading-relaxed">
            THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. ENCLAVE EXPRESSLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
        </div>
      </section>

      {/* 10. Liability Limitation */}
      <section id="liability-limitation" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          10. Limitation of Liability
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To the maximum extent permitted by applicable law, in no event shall ENCLAVE, its operators, affiliates, or contributors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, unauthorized device access, or communication interruptions arising from the use of or inability to use the Service.
        </p>
      </section>

      {/* 11. Governing Law */}
      <section id="governing-law" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          11. Governing Law & Dispute Resolution
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of India, subject to applicable provisions of the Information Technology Act, 2000, and the Digital Personal Data Protection Act, 2023. Any formal disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the competent courts having jurisdiction over the platform operator.
        </p>
      </section>

      {/* 12. Contact */}
      <section id="contact-changes" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          12. Modifications & Contact
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We may update these Terms from time to time to reflect regulatory developments or architectural improvements. Continued use of ENCLAVE following posted updates constitutes acceptance of the modified Terms.
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-1">
          <div><strong className="text-[var(--text-primary)]">Legal Desk Inquiries:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Support & Operations:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
