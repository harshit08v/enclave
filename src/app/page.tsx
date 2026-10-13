import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/marketing/HeroSection';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Lock,
  Shield,
  Clock,
  HelpCircle,
  CheckCircle2,
  Globe2,
  Video,
  FileCode2,
  KeyRound,
  ShieldCheck,
  Server
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ENCLAVE — Private by Design. Gone When You Leave.',
  description: 'A private room for conversations that don’t need to stay. Ephemeral, end-to-end encrypted rooms that destroy themselves when the last participant leaves. Zero server logs.',
  keywords: [
    'ephemeral messaging',
    'private chat room',
    'end to end encrypted video calls',
    'zero retention messaging',
    'browser encrypted rooms',
    'AES-256-GCM',
    'disposable chat'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app',
  },
  openGraph: {
    title: 'ENCLAVE — Ephemeral Private Communication',
    description: 'Private by design. Gone when you leave. A private room for conversations that don’t need to stay.',
    type: 'website',
    url: 'https://enclave.vercel.app',
    siteName: 'ENCLAVE',
    images: [{ url: '/logo.jpg', width: 800, height: 800, alt: 'ENCLAVE Brand Emblem' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ENCLAVE — Ephemeral Private Communication',
    description: 'Private by design. Gone when you leave.',
    images: ['/logo.jpg'],
  },
};

const homeFaqs = [
  {
    q: 'How does ENCLAVE differ from Signal or WhatsApp?',
    a: 'Signal and WhatsApp save your chat history permanently on your device and link your identity to a permanent phone number. ENCLAVE creates ephemeral chambers that operate without phone numbers, write zero chat logs to disk, and are permanently obliterated the moment participants exit.'
  },
  {
    q: 'What encryption protocols protect my conversations?',
    a: 'Every message and signaling frame is encrypted locally in your browser using 256-bit AES-GCM with a fresh 96-bit random IV per frame. Keys are derived via PBKDF2-HMAC-SHA256 (100,000 iterations) from secret room salt.'
  },
  {
    q: 'Can the server read or store my messages?',
    a: 'No. The server operates as a blind relay courier. It forwards opaque ciphertext packets without holding decryption keys and stores zero message data in databases or persistent disk volumes.'
  },
  {
    q: 'What is the Two-Factor Channel Separation model?',
    a: 'To enter a room, two distinct factors are required: the unique room URL and the secret access pass. Because the access pass is kept out-of-band and never included in the URL, web crawlers and eavesdroppers cannot calculate the chamber key.'
  },
  {
    q: 'Do guests need an app download or account to participate?',
    a: 'No. Guests can instantly join from any modern web browser on desktop or mobile without downloading software, creating accounts, or sharing personal data.'
  },
  {
    q: 'Can law enforcement or third parties request my historical chats?',
    a: 'Because ENCLAVE has zero persistent databases, zero chat transcripts, and zero stored decryption keys, there is mathematically no historical user communication to surrender.'
  }
];

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://enclave.vercel.app/#website',
        url: 'https://enclave.vercel.app',
        name: 'ENCLAVE',
        description: 'Private by design. Ephemeral, end-to-end encrypted rooms that destroy themselves when the last participant leaves.',
        publisher: {
          '@type': 'Organization',
          name: 'ENCLAVE Security & Privacy Engineering',
          url: 'https://enclave.vercel.app',
          logo: {
            '@type': 'ImageObject',
            url: 'https://enclave.vercel.app/logo.jpg',
            caption: 'ENCLAVE Security Brand Logo'
          }
        }
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://enclave.vercel.app/#faq',
        mainEntity: homeFaqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.a,
          },
        }))
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col selection:bg-[#E7F0EC] selection:text-[#174A3A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1">
        {/* Approved Clean Hero */}
        <HeroSection />

        {/* TRUST SIGNALS & HARDENED INVARIANTS BAR */}
        <section className="border-y border-[#E4E4DF] bg-[#FFFFFF] py-6 px-6">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6 text-xs font-mono text-[#555555]">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#174A3A]" />
              <span className="font-semibold text-[#111111]">AES-256-GCM Military Grade</span>
            </div>
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-[#174A3A]" />
              <span>100% Volatile RAM Only</span>
            </div>
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[#174A3A]" />
              <span>Two-Factor Out-of-Band Gate</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe2 className="w-4 h-4 text-[#174A3A]" />
              <span>12 Global Edge Nodes</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#174A3A]" />
              <span className="text-[#174A3A] font-semibold">99.99% Node Uptime</span>
            </div>
          </div>
        </section>

        {/* 1. HOW IT WORKS (Simplified 3 Steps) */}
        <section className="py-20 sm:py-24 border-b border-[#E4E4DF] bg-[#FAFAF8]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
                HOW IT WORKS
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111] leading-tight">
                Create a room, share the link, and start chatting.
              </h2>
              <p className="text-base text-[#666666] leading-relaxed">
                No accounts, no downloads, and zero message archives on the server.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 01
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Create a room
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Generate an ephemeral room in one click. Set an optional access pass for two-factor channel separation.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 02
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Share with your group
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Send the link to whoever you want to talk with. Only people with the link and out-of-band pass can unwrap keys.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    STEP 03
                  </span>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Leave when done
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Chats are temporary. When everyone leaves, RAM buffers are zeroized and the room is permanently tombstoned.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link
                href="/how-it-works"
                className="inline-flex items-center text-xs font-mono font-semibold text-[#174A3A] hover:underline gap-1.5"
              >
                <span>Explore the full 7-phase cryptographic protocol &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 2. BUILT FOR PRIVACY FROM DAY ONE */}
        <section className="py-20 sm:py-24 border-b border-[#E4E4DF] bg-[#F4F4F0]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
                PRIVACY BY DEFAULT
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111] leading-tight">
                Built for conversations that shouldn&apos;t stick around.
              </h2>
              <p className="text-base text-[#666666] leading-relaxed">
                Most chat apps save your conversations forever. ENCLAVE is engineered so they don&apos;t have to.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Point 1 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Encrypted on your device
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Your messages are encrypted before they leave your browser, so only the people in the room can read them.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Nothing saved to disk
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    The server relays messages between participants in volatile memory without writing chat logs or transcripts to disk.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#111111]">
                    Rooms expire automatically
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    When a room is closed or times out, its data is obliterated from the server with permanent anti-resurrection tombstones.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Documentation Note */}
            <div className="mt-8 p-5 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <p className="text-xs text-[#666666] leading-relaxed">
                Looking for cryptographic specs, key derivation details, or threat model limits?
              </p>
              <Link
                href="/security"
                className="text-xs font-mono font-semibold text-[#174A3A] hover:underline flex items-center gap-1.5 shrink-0"
              >
                <span>Read our security architecture</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 3. CAPABILITIES PREVIEW (Services & Network) */}
        <section className="py-20 sm:py-24 border-b border-[#E4E4DF] bg-[#FAFAF8]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Card 1: Services */}
              <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    <Video className="w-3.5 h-3.5" />
                    <span>AUDIO, VIDEO & TEXT CHAMBERS</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#111111] tracking-tight">
                    Peer-to-Peer Encrypted Calling & Instant Messaging
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    ENCLAVE supports multi-party WebRTC audio and video mesh, blind text relaying, and self-destructing file drops that vanish on exit.
                  </p>
                </div>
                <Button asChild variant="outline" className="text-xs font-mono tracking-wider w-full sm:w-auto">
                  <Link href="/services">
                    <span>EXPLORE ALL SERVICES &rarr;</span>
                  </Link>
                </Button>
              </div>

              {/* Card 2: Locations */}
              <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                    <Globe2 className="w-3.5 h-3.5" />
                    <span>12 GLOBAL RELAY LOCATIONS</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#111111] tracking-tight">
                    Sub-40ms Low Latency Volatile Edge Network
                  </h3>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Our edge points of presence in Frankfurt, Zurich, Amsterdam, Singapore, Ashburn, and Tokyo route encrypted packets purely in RAM.
                  </p>
                </div>
                <Button asChild variant="outline" className="text-xs font-mono tracking-wider w-full sm:w-auto">
                  <Link href="/locations">
                    <span>VIEW GLOBAL RELAY NODES &rarr;</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOME INTERACTIVE FAQ SECTION */}
        <section className="py-20 sm:py-24 border-b border-[#E4E4DF] bg-[#F4F4F0]">
          <div className="max-w-4xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 text-xs font-mono font-bold uppercase tracking-wider text-[#174A3A] bg-[#E7F0EC] px-3 py-1 rounded-full border border-[#C9DDD5]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111]">
                Common Questions About ENCLAVE
              </h2>
              <p className="text-base text-[#666666] max-w-xl mx-auto">
                Everything you need to know about our cryptographic model, ephemeral room lifecycle, and zero-retention guarantees.
              </p>
            </div>

            <div className="space-y-4">
              {homeFaqs.map((faq, fIdx) => (
                <details
                  key={fIdx}
                  className="group p-6 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] hover:border-[#C9DDD5] transition-all duration-200 shadow-xs open:shadow-sm"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none text-base sm:text-lg font-medium text-[#111111] group-open:text-[#174A3A]">
                    <span className="pr-4">{faq.q}</span>
                    <span className="shrink-0 w-6 h-6 rounded-full bg-[#E7F0EC] text-[#174A3A] flex items-center justify-center text-sm font-mono font-bold transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 pt-4 border-t border-[#F0F0EB] text-sm sm:text-base text-[#666666] leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="text-center pt-4">
              <Link
                href="/faq"
                className="inline-flex items-center space-x-2 text-xs font-mono font-semibold text-[#174A3A] hover:underline"
              >
                <span>Read all answers in our complete Knowledge Base & FAQ &rarr;</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 5. STRONG CALL TO ACTION */}
        <section className="py-24 sm:py-28 px-6 text-center bg-[#FAFAF8]">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111]">
              Ready to talk in private?
            </h2>
            <p className="text-base sm:text-lg text-[#666666] leading-relaxed text-balance">
              Start an ephemeral chamber in seconds. No email, phone number, or software installation needed.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
                <Link href="/signup" className="flex items-center justify-center space-x-2">
                  <span>START CHATTING</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
                <Link href="/app" className="flex items-center justify-center space-x-2">
                  <span>JOIN A ROOM</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
