import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Lock, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | FAQ | ENCLAVE',
  description: 'Explore common questions about ENCLAVE\'s zero-knowledge cryptography, volatile ephemeral storage, audio/video privacy, and message deletion rules.',
  keywords: [
    'ENCLAVE FAQ',
    'ephemeral chat questions',
    'zero retention security questions',
    'WebRTC encryption FAQ',
    'volatile courier privacy'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions | FAQ | ENCLAVE',
    description: 'Answers to architecture, encryption, and privacy questions regarding ENCLAVE.',
    url: 'https://enclave.vercel.app/faq',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'ENCLAVE FAQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frequently Asked Questions | FAQ | ENCLAVE',
    description: 'Answers to architecture, encryption, and privacy questions regarding ENCLAVE.',
    images: ['https://enclave.vercel.app/og-image.png'],
  },
};

const faqCategories = [
  {
    category: 'Cryptographic Architecture & Security',
    items: [
      {
        q: 'How does ENCLAVE encrypt my messages and calls?',
        a: 'All text messages, media frames, and signaling packets are encrypted locally in your browser using AES-256-GCM before being transmitted. Encryption keys are derived using memory-hard Argon2id and HKDF-SHA256 from your private room secrets. The ENCLAVE server functions solely as a blind relay and possesses zero mathematical ability to decrypt your communication.'
      },
      {
        q: 'What is the Two-Factor Channel Separation model?',
        a: 'To join an ENCLAVE room securely, two elements are required: the unique room URL and the out-of-band access pass. Because the access pass is never included in the URL or sent in plaintext to the server, an eavesdropper intercepting the link alone cannot compute the room master key.'
      },
      {
        q: 'Does ENCLAVE store encryption keys or private passwords?',
        a: 'No. Cryptographic keys exist strictly in client RAM for the duration of your session. Once you close the tab or dissolve the room, the CryptoKey references are unpinned and overwritten. The server never sees or logs your raw keys.'
      }
    ]
  },
  {
    category: 'Ephemeral Lifecycle & Data Retention',
    items: [
      {
        q: 'What happens when everyone leaves a room?',
        a: 'The moment the final participant disconnects or leaves, the room is permanently dissolved. Its ephemeral state and in-transit buffers are zeroized in RAM, and its identifier is cryptographically tombstoned so that it cannot be resurrected by any party.'
      },
      {
        q: 'Does ENCLAVE keep chat logs or server backups?',
        a: 'No. ENCLAVE does not write chat history, message bodies, or attachments to persistent relational databases or persistent message archives. Relays operate using volatile cache buffers with a 1-hour maximum TTL. What is never stored in a message database cannot be leaked or subpoenaed.'
      },
      {
        q: 'Can law enforcement or third parties request my chat history?',
        a: 'Because ENCLAVE employs client-side end-to-end encryption with ephemeral relay routing, we maintain zero historical message databases, zero message transcripts, and zero decryption keys. There is no historical communication archive stored on our servers to surrender.'
      }
    ]
  },
  {
    category: 'Features, Media & Compatibility',
    items: [
      {
        q: 'Can I send images, files, and voice notes in ENCLAVE?',
        a: 'Yes. ENCLAVE supports end-to-end encrypted file sharing, images, and voice recordings. Files are chunked and encrypted on your device. Once delivered or upon room closure, all chunks are immediately purged from server memory.'
      },
      {
        q: 'Do guests need an account or software download to join?',
        a: 'No. Counterparties can join directly from any modern web browser without registering an account or providing a phone number. They simply enter their display name or pseudonym and the secret room passkey.'
      },
      {
        q: 'Does ENCLAVE support audio and video calls?',
        a: 'Yes. ENCLAVE incorporates peer-to-peer WebRTC mesh for direct, browser-to-browser encrypted audio and video conferencing with zero intermediate recording.'
      }
    ]
  },
  {
    category: 'Accounts, Verification & Privacy',
    items: [
      {
        q: 'Why does ENCLAVE offer email verification if it is private?',
        a: 'Email verification is completely optional for standard guest rooms. For users who wish to reserve a persistent pseudonym or manage custom rooms, email verification acts as a rate-limiting and anti-abuse defense against malicious bots, without storing your room conversations.'
      },
      {
        q: 'Can I delete my account at any time?',
        a: 'Yes. You can instantly obliterate your account and all associated tokens at any moment through the Account Settings console or by submitting a cryptographic self-purge request.'
      }
    ]
  }
];

export default function FAQPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((cat) =>
      cat.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      }))
    ),
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-24">
        {/* Header Hero */}
        <section className="max-w-4xl mx-auto px-6 mb-16 text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>KNOWLEDGE BASE &amp; FAQ</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif italic font-normal tracking-tight text-[var(--text-primary)] leading-[1.08]">
            Frequently Asked Questions
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about ENCLAVE’s cryptographic architecture, memory zeroization, zero-retention policies, and ephemeral room safety.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>AES-256-GCM Verified</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Zero Server Plaintext</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Volatile Relay Cache</span>
            </span>
          </div>
        </section>

        {/* FAQ Groups */}
        <section className="max-w-4xl mx-auto px-6 space-y-14">
          {faqCategories.map((cat, idx) => (
            <div key={idx} className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--accent)] font-bold bg-[var(--accent-soft)] px-2.5 py-1 rounded border border-[var(--accent-border)]">
                  0{idx + 1}
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                  {cat.category}
                </h2>
              </div>

              <div className="space-y-4">
                {cat.items.map((item, itemIdx) => (
                  <details
                    key={itemIdx}
                    className="group p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-border)] transition-all duration-200 shadow-xs open:shadow-sm"
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none text-base sm:text-lg font-medium text-[var(--text-primary)] group-open:text-[var(--accent)]">
                      <span className="pr-4">{item.q}</span>
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-sm font-mono font-bold transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 pt-4 border-t border-[var(--border)] text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Quick Links / Internal Navigation Callout */}
        <section className="max-w-4xl mx-auto px-6 mt-16">
          <div className="p-8 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-mono text-[var(--accent)] font-semibold uppercase">SPECIFICATIONS</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Cryptographic Specs</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Detailed equations, key derivation schedules, and nonce management.
              </p>
              <Link href="/security" className="inline-flex items-center text-xs font-mono font-semibold text-[var(--accent)] hover:underline pt-1">
                <span>View Security Spec &rarr;</span>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[var(--accent)] font-semibold uppercase">GLOBAL INFRASTRUCTURE</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Edge Relay Nodes</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Discover our zero-retention RAM points of presence across 12 countries.
              </p>
              <Link href="/locations" className="inline-flex items-center text-xs font-mono font-semibold text-[var(--accent)] hover:underline pt-1">
                <span>Explore Network &rarr;</span>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[var(--accent)] font-semibold uppercase">COMMUNICATION SERVICES</div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Chambers &amp; Solutions</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Learn how ENCLAVE handles ephemeral voice, video, text, and file drops.
              </p>
              <Link href="/services" className="inline-flex items-center text-xs font-mono font-semibold text-[var(--accent)] hover:underline pt-1">
                <span>Explore Services &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 mt-16 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)]">
            Have a question not listed here?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
            Contact our engineering and security team directly, or start a test ephemeral chamber in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)]">
              <Link href="/contact" className="flex items-center justify-center space-x-2">
                <span>CONTACT TEAM</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
