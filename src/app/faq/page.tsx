import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Lock, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | FAQ | ENCLAVE',
  description: 'Explore common questions about ENCLAVE\'s zero-knowledge cryptography, RAM-only ephemeral storage, audio/video privacy, and message deletion rules.',
  keywords: [
    'ENCLAVE FAQ',
    'ephemeral chat questions',
    'zero retention security questions',
    'WebRTC encryption FAQ',
    'RAM only privacy'
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
  },
};

const faqCategories = [
  {
    category: 'Cryptographic Architecture & Security',
    items: [
      {
        q: 'How does ENCLAVE encrypt my messages and calls?',
        a: 'All text messages, media frames, and signaling packets are encrypted locally in your browser using AES-256-GCM before being transmitted. Encryption keys are derived using PBKDF2 with 100,000 iterations from your private room secrets. The ENCLAVE server functions solely as a blind relay and possesses zero mathematical ability to decrypt your communication.'
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
        a: 'No. ENCLAVE does not write chat history, message bodies, or attachments to persistent disk or relational databases. Relays operate in volatile RAM only. What is never stored can never be leaked, hacked, or subpoenaed.'
      },
      {
        q: 'Can law enforcement or third parties request my chat history?',
        a: 'Because ENCLAVE employs zero-knowledge architecture with RAM-only ephemeral routing, we possess zero historical logs, zero message transcripts, and zero decryption keys. There is literally no user data stored on our servers to surrender.'
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
        a: 'No. Guests can join directly from any modern web browser (Chrome, Firefox, Safari, Edge) without registering an account, providing a phone number, or installing third-party apps.'
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
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col selection:bg-[#E7F0EC] selection:text-[#174A3A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-24">
        {/* Header Hero */}
        <section className="max-w-4xl mx-auto px-6 mb-16 text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-[#174A3A]" />
            <span>KNOWLEDGE BASE & FAQ</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08]">
            Frequently Asked Questions
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about ENCLAVE’s cryptographic architecture, memory zeroization, zero-retention policies, and ephemeral room safety.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#666666]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>AES-256-GCM Verified</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>Zero Server Plaintext</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span>RAM-Only Relays</span>
            </span>
          </div>
        </section>

        {/* FAQ Groups */}
        <section className="max-w-4xl mx-auto px-6 space-y-14">
          {faqCategories.map((cat, idx) => (
            <div key={idx} className="space-y-6">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#E4E4DF]">
                <span className="text-xs font-mono text-[#174A3A] font-bold bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                  0{idx + 1}
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold text-[#111111] tracking-tight">
                  {cat.category}
                </h2>
              </div>

              <div className="space-y-4">
                {cat.items.map((item, itemIdx) => (
                  <details
                    key={itemIdx}
                    className="group p-6 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] hover:border-[#C9DDD5] transition-all duration-200 shadow-xs open:shadow-sm"
                  >
                    <summary className="flex items-center justify-between cursor-pointer list-none text-base sm:text-lg font-medium text-[#111111] group-open:text-[#174A3A]">
                      <span className="pr-4">{item.q}</span>
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#E7F0EC] text-[#174A3A] flex items-center justify-center text-sm font-mono font-bold transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 pt-4 border-t border-[#F0F0EB] text-sm sm:text-base text-[#666666] leading-relaxed">
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
          <div className="p-8 rounded-2xl bg-[#F4F4F0] border border-[#E4E4DF] grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#174A3A] font-semibold uppercase">SPECIFICATIONS</div>
              <h3 className="text-base font-semibold text-[#111111]">Cryptographic Specs</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Detailed equations, key derivation schedules, and nonce management.
              </p>
              <Link href="/security" className="inline-flex items-center text-xs font-mono font-semibold text-[#174A3A] hover:underline pt-1">
                <span>View Security Spec &rarr;</span>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#174A3A] font-semibold uppercase">GLOBAL INFRASTRUCTURE</div>
              <h3 className="text-base font-semibold text-[#111111]">Edge Relay Nodes</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Discover our zero-retention RAM points of presence across 12 countries.
              </p>
              <Link href="/locations" className="inline-flex items-center text-xs font-mono font-semibold text-[#174A3A] hover:underline pt-1">
                <span>Explore Network &rarr;</span>
              </Link>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono text-[#174A3A] font-semibold uppercase">COMMUNICATION SERVICES</div>
              <h3 className="text-base font-semibold text-[#111111]">Chambers & Solutions</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Learn how ENCLAVE handles ephemeral voice, video, text, and file drops.
              </p>
              <Link href="/services" className="inline-flex items-center text-xs font-mono font-semibold text-[#174A3A] hover:underline pt-1">
                <span>Explore Services &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 mt-16 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#111111]">
            Have a question not listed here?
          </h2>
          <p className="text-sm sm:text-base text-[#666666] max-w-xl mx-auto">
            Contact our engineering and security team directly, or start a test ephemeral chamber in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
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
