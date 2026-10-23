import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import {
  Shield,
  Lock,
  FileText,
  UserCheck,
  Scale,
  Clock,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Mail,
  AlertTriangle,
  HardDrive
} from 'lucide-react';

export const metadata = {
  title: 'Legal Center | Policies & Compliance | ENCLAVE',
  description: 'Official legal documents, privacy policies, terms of service, and cryptographic disclosures for ENCLAVE.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal',
  },
};

interface PolicyCard {
  title: string;
  href: string;
  category: 'Legal' | 'Privacy' | 'Security' | 'User Rights';
  summary: string;
  lastUpdated: string;
  purpose: string;
}

const POLICIES: PolicyCard[] = [
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    category: 'Privacy',
    summary: 'Detailed accounting of all data processed, local account storage, ephemeral in-memory packet routing, and privacy protections.',
    purpose: 'Explains personal data processing, legal bases, minimization, and privacy protections.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Terms of Service',
    href: '/legal/terms',
    category: 'Legal',
    summary: 'Binding agreement governing use of the ENCLAVE ephemeral communication platform, account responsibilities, and service boundaries.',
    purpose: 'Defines acceptable use, account eligibility, user ownership of content, and liability terms.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Cookie & Storage Policy',
    href: '/legal/cookies',
    category: 'Privacy',
    summary: 'Exhaustive audit of browser localStorage keys and session tokens used strictly for authentication and preferences—zero tracking cookies.',
    purpose: 'Documents essential browser storage, tokens, themes, and absence of tracking scripts.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Contact & Privacy Requests',
    href: '/legal/contact',
    category: 'User Rights',
    summary: 'Verified pathways for submitting privacy requests, data access or erasure petitions, security findings, and legal notices.',
    purpose: 'Provides direct communication channels and verification steps for statutory requests.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Security & Encryption Policy',
    href: '/legal/security',
    category: 'Security',
    summary: 'Technical and architectural specifications of ENCLAVE’s client-side AES-256-GCM, Argon2id key derivation, and blind server relay model.',
    purpose: 'Details cryptographic standards, key hierarchy, threat model assumptions, and limitations.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    category: 'Privacy',
    summary: 'Full lifecycle matrix documenting automatic in-memory room reaping, ephemeral media purging, and account zeroization workflows.',
    purpose: 'Explains exact retention windows, automated memory destruction, and data zeroization.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Acceptable Use Policy',
    href: '/legal/acceptable-use',
    category: 'Legal',
    summary: 'Prohibited activities on the ENCLAVE platform, abusive behavior standards, and platform enforcement mechanisms within E2EE constraints.',
    purpose: 'Outlines prohibited abusive activities, malware prevention, and enforcement parameters.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Copyright & Takedown Policy',
    href: '/legal/copyright',
    category: 'Legal',
    summary: 'Notice and takedown procedure for copyrighted material, rights holder reporting mechanisms, and intermediary role clarifications.',
    purpose: 'Establishes good-faith reporting procedures for intellectual property rights holders.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Account Deletion & Data Rights',
    href: '/legal/data-rights',
    category: 'User Rights',
    summary: 'Step-by-step instructions for executing self-service account deletion, exercising statutory rights, and data rectification under DPDP Act & international laws.',
    purpose: 'Empowers users to exercise access, correction, grievance, and complete erasure rights.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Security Vulnerability Disclosure',
    href: '/legal/security-disclosure',
    category: 'Security',
    summary: 'Responsible disclosure guidelines for security researchers, safe harbor principles, scope boundaries, and report triage timelines.',
    purpose: 'Sets coordinated vulnerability disclosure guidelines and safe testing rules.',
    lastUpdated: 'October 2026'
  },
  {
    title: 'Law Enforcement & Legal Requests',
    href: '/legal/legal-requests',
    category: 'Legal',
    summary: 'Operational framework for handling governmental, judicial, and law enforcement requests, with strict mathematical disclosure limits.',
    purpose: 'Clarifies legal process review, statutory validity requirements, and cryptographic limits.',
    lastUpdated: 'October 2026'
  }
];

export default function LegalCenterPage() {
  const categories = [
    {
      name: 'Privacy & Data Handling',
      icon: EyeOff,
      description: 'How ENCLAVE minimizes personal data, enforces zero-knowledge storage, and handles browser state.',
      policies: POLICIES.filter(p => p.category === 'Privacy')
    },
    {
      name: 'Security & Cryptography',
      icon: Lock,
      description: 'Mathematical foundations, cryptographic standards, blind relay architecture, and vulnerability reporting.',
      policies: POLICIES.filter(p => p.category === 'Security')
    },
    {
      name: 'Terms & Platform Governance',
      icon: Scale,
      description: 'Binding contractual terms, acceptable conduct standards, and copyright takedown procedures.',
      policies: POLICIES.filter(p => p.category === 'Legal')
    },
    {
      name: 'User Rights & Compliance',
      icon: UserCheck,
      description: 'Self-service account deletion, statutory rights under data protection laws, and legal requests.',
      policies: POLICIES.filter(p => p.category === 'User Rights')
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>TRANSPARENCY & LEGAL CENTER</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.08]">
            Legal, Privacy & <br />
            <span className="text-[var(--text-muted)] font-normal">Security Center</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            ENCLAVE is built on a simple promise: <strong className="text-[var(--text-primary)] font-medium">Private by design. Gone when you leave.</strong> Our legal documents and privacy policies directly reflect our verified codebase architecture, mathematical boundaries, and operational practices.
          </p>

          {/* Core Principles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-2 shadow-xs">
              <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Plaintext Storage</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Messages and media are encrypted in client browser memory with AES-256-GCM before transmission. Our server acts as a blind courier and cannot decrypt your data.
              </p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-2 shadow-xs">
              <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Ephemeral Room Lifecycle</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Chat rooms reside only in volatile RAM. When participants leave or after brief inactivity timeouts, the room, metadata, and memory packets are permanently erased.
              </p>
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-2 shadow-xs">
              <div className="flex items-center space-x-2 text-[var(--accent)] font-mono text-xs font-semibold uppercase tracking-wider">
                <EyeOff className="w-4 h-4" />
                <span>Zero Tracking or Ads</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                We do not use advertising trackers, analytics SDKs, behavioral telemetry, or third-party profiling cookies. Browser storage is used solely for essential authentication.
              </p>
            </div>
          </div>
        </section>

        {/* Categorized Policy Cards */}
        <section className="max-w-7xl mx-auto px-6 mb-20 space-y-12">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.name} className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-[var(--border)] pb-3">
                  <Icon className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)]">
                      {cat.name}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.policies.map((policy) => (
                    <Link
                      key={policy.href}
                      href={policy.href}
                      className="group bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-6 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
                            {policy.category}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {policy.lastUpdated}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors flex items-center justify-between">
                          <span>{policy.title}</span>
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[var(--accent)]" />
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {policy.summary}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--accent)] font-medium">
                        <span>View Document</span>
                        <span>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Master Policy Index Table */}
        <section className="max-w-7xl mx-auto px-6 mb-20">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-xl font-medium text-[var(--text-primary)]">
                Complete Policy Directory
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Index of all 11 published legal, security, and data governance policies.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Core Scope & Purpose</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                  {POLICIES.map((p) => (
                    <tr key={p.href} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                        <Link href={p.href} className="hover:text-[var(--accent)] transition-colors">
                          {p.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md text-[var(--text-secondary)] leading-snug">
                        {p.purpose}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-muted)] whitespace-nowrap">
                        {p.lastUpdated}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={p.href}
                          className="inline-flex items-center space-x-1 text-[var(--accent)] font-medium hover:underline"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Support & Privacy Contact Callout */}
        <section className="max-w-7xl mx-auto px-6">
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 text-[var(--accent)] text-xs font-mono font-semibold uppercase tracking-wider">
                <Mail className="w-4 h-4" />
                <span>Direct Legal & Privacy Inquiries</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-medium text-[var(--text-primary)]">
                Have questions about our privacy model or terms?
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Submit data rights inquiries, report security concerns, or contact our compliance desk directly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Link
                href="/legal/contact"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--accent)] text-white text-xs font-mono font-medium hover:bg-[var(--accent-hover)] transition-colors text-center shadow-xs flex items-center justify-center space-x-2"
              >
                <span>Submit Inquiry</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/legal/data-rights"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono font-medium hover:border-[var(--accent)] transition-colors text-center"
              >
                <span>Exercise Data Rights</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
