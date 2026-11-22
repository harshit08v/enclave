import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ContactForm from './ContactForm';
import { Mail, ShieldAlert, Clock, ArrowRight, MessageSquare, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us | ENCLAVE Support & Legal Desk',
  description: 'Get in touch with the ENCLAVE engineering and security team. Submit vulnerability disclosures, enterprise inquiries, press requests, and general support.',
  keywords: [
    'contact ENCLAVE',
    'security vulnerability disclosure',
    'responsible disclosure ENCLAVE',
    'enterprise privacy support',
    'PGP key ENCLAVE',
    'privacy inquiries'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/contact',
  },
  openGraph: {
    title: 'Contact Us | ENCLAVE Support & Legal Desk',
    description: 'Encrypted communication channels and support for security researchers and enterprise teams.',
    url: 'https://enclave.vercel.app/contact',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Contact ENCLAVE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | ENCLAVE Support & Legal Desk',
    description: 'Get in touch with the ENCLAVE team.',
    images: ['https://enclave.vercel.app/og-image.png'],
  },
};

export default function ContactPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'ENCLAVE Contact & Security Disclosure',
    description: 'Official contact portal for general inquiries, security disclosures, and enterprise solutions.',
    url: 'https://enclave.vercel.app/contact',
    mainEntity: {
      '@type': 'Organization',
      name: 'ENCLAVE',
      url: 'https://enclave.vercel.app',
      email: 'enclave.verify@gmail.com',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'security disclosure',
          email: 'enclave.verify@gmail.com',
          availableLanguage: ['English']
        },
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'enclave.verify@gmail.com',
          availableLanguage: ['English']
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-24">
        {/* Header Hero */}
        <section className="max-w-4xl mx-auto px-6 mb-16 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
            <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>COMMUNICATION CHANNELS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[var(--text-primary)] leading-[1.08]">
            Contact ENCLAVE & Security Engineering
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Direct encrypted channels for security researchers, enterprise confidentiality deployments, privacy policy inquiries, and general assistance.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              <span>&lt; 24h Response SLA</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
              <span>Responsible Disclosure Program</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>PGP Encrypted Ingestion</span>
            </span>
          </div>
        </section>

        {/* Content Section */}
        <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Direct info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="text-xs font-mono text-[var(--accent)] font-semibold uppercase">DIRECT CONTACT</div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                How to Reach Us
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Whether you discovered an anomaly in our zero-knowledge protocol, need assistance, or want to deploy an isolated Enterprise Enclave, our engineers are accessible.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-xs">
                <div className="text-xs font-mono text-[var(--text-muted)] uppercase">SECURITY & DISCLOSURES</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">enclave.verify@gmail.com</div>
                <p className="text-xs text-[var(--text-secondary)] pt-1">
                  For vulnerability reports and cryptographic analysis. PGP encryption strongly recommended.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-xs">
                <div className="text-xs font-mono text-[var(--text-muted)] uppercase">SUPPORT & GENERAL INQUIRIES</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">enclave.verify@gmail.com</div>
                <p className="text-xs text-[var(--text-secondary)] pt-1">
                  General inquiries, account deletion requests, and technical questions.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1 shadow-xs">
                <div className="text-xs font-mono text-[var(--text-muted)] uppercase">LEGAL & REGULATORY NOTICES</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">ENCLAVE Legal Operations</div>
                <p className="text-xs text-[var(--text-secondary)] pt-1">
                  Please consult our{' '}
                  <Link href="/legal/legal-requests" className="text-[var(--accent)] underline font-medium">
                    Law Enforcement & Legal Guidelines
                  </Link>{' '}
                  prior to submission.
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-4 border-t border-[var(--border)] space-y-2 text-xs font-mono">
              <div className="text-[var(--text-muted)] uppercase">RELATED RESOURCES</div>
              <div>
                <Link href="/security" className="text-[var(--accent)] hover:underline flex items-center gap-1">
                  <span>Cryptographic Architecture & Threat Model</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <Link href="/legal/security-disclosure" className="text-[var(--accent)] hover:underline flex items-center gap-1">
                  <span>Security Vulnerability Disclosure Policy</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <Link href="/faq" className="text-[var(--accent)] hover:underline flex items-center gap-1">
                  <span>Frequently Asked Questions</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
