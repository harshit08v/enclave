import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Shield,
  Video,
  FileCode2,
  KeyRound,
  Trash2,
  Building2,
  CheckCircle2,
  XCircle,
  Cpu
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ephemeral Services & Cryptographic Solutions | ENCLAVE',
  description: 'Explore ENCLAVE’s privacy services: WebRTC encrypted video/voice calls, zero-knowledge text relays, self-destructing file drops, and isolated enterprise enclaves.',
  keywords: [
    'ENCLAVE services',
    'ephemeral video conferencing',
    'zero-knowledge messaging solutions',
    'self-destructing file transfer',
    'private encrypted chambers',
    'enterprise private relays',
    'confidential communications'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/services',
  },
  openGraph: {
    title: 'Ephemeral Services & Cryptographic Solutions | ENCLAVE',
    description: 'Purpose-built privacy services: zero-retention video calling, blind text relays, and self-destructing vaults.',
    url: 'https://enclave.vercel.app/services',
    siteName: 'ENCLAVE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ephemeral Services & Cryptographic Solutions | ENCLAVE',
    description: 'Private by design. Gone when you leave. Discover ENCLAVE communication services.',
  },
};

const serviceCards = [
  {
    icon: Video,
    id: 'voice-video',
    title: 'Ephemeral Voice & Video Chambers',
    badge: 'WebRTC P2P E2EE',
    description: 'Real-time multi-party audio and video conferencing operating directly in browser memory without intermediate recording or cloud transcription.',
    features: [
      'Peer-to-peer browser mesh topology',
      'Client-side DTLS-SRTP encryption',
      'Zero recording, transcription, or cloud storage',
      'Automatic audio stream teardown upon departure'
    ]
  },
  {
    icon: Shield,
    id: 'blind-relay',
    title: 'Zero-Knowledge Blind Relays',
    badge: 'AES-256-GCM',
    description: 'Instant text conversation with client-side cryptographic encapsulation. Relays forward opaque binary ciphertext without possession of decryption keys.',
    features: [
      'AES-256-GCM with unique 96-bit IV per frame',
      'PBKDF2 100,000 round key derivation',
      'Zero server-side plaintext indexing',
      'Stateless message forwarding in volatile RAM'
    ]
  },
  {
    icon: FileCode2,
    id: 'media-vault',
    title: 'Self-Destructing File Transit',
    badge: 'Encrypted Ephemeral Chunks',
    description: 'Share confidential documents, source code snippets, and images that exist only as encrypted RAM chunks and disintegrate on room closure.',
    features: [
      'Local client-side file chunk encryption',
      'RAM-only transit with zero disk caching',
      'Strict 50MB per-room ephemeral limit',
      'Immediate chunk obliteration upon download or exit'
    ]
  },
  {
    icon: KeyRound,
    id: 'two-factor-access',
    title: 'Out-of-Band Room Gating',
    badge: 'Dual-Factor Separation',
    description: 'Cryptographic separation of the room URL and the secret access pass. Link crawlers and URL sniffers cannot compute the chamber key.',
    features: [
      'Decoupled URL identifier and access secret',
      'PBKDF2 key-wrapping schedule in memory',
      'Zero plain pass transmission over the wire',
      'Constant-time authentication commitment check'
    ]
  },
  {
    icon: Trash2,
    id: 'memory-zeroization',
    title: 'Cryptographic Memory Zeroization',
    badge: 'Definitive Dissolution',
    description: 'When the final participant leaves or triggers room closure, the chamber identifier is permanently tombstoned and RAM buffers are zeroized.',
    features: [
      'Immediate unpinning of CryptoKey references',
      'In-flight buffer wiping with random noise',
      'Permanent anti-resurrection tombstones',
      'Zero recoverable residual state'
    ]
  },
  {
    icon: Building2,
    id: 'enterprise-enclaves',
    title: 'Enterprise Dedicated Enclaves',
    badge: 'Private Infrastructure',
    description: 'Turnkey private relays for law firms, investigative journalists, healthcare boards, and organizations requiring verifiable zero-retention boundaries.',
    features: [
      'Isolated VPC and sovereign edge routing',
      'Custom retention windows and air-gapped readiness',
      'Strict GDPR, HIPAA, and CCPA zero-data compatibility',
      'Verifiable open-source audit guarantees'
    ]
  }
];

const comparisonData = [
  { feature: 'Zero Server Message Storage', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: false },
  { feature: 'No Phone Number / Email Required', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: false },
  { feature: 'Automatic Room Obliteration on Exit', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: false },
  { feature: 'Browser-Native Zero Installation', enclave: true, signal: false, telegram: true, whatsapp: true, zoom: false },
  { feature: 'Dual-Factor Out-of-Band Secret Gate', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: true },
  { feature: 'RAM-Only Blind Server Architecture', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: false },
  { feature: 'Anti-Resurrection Cryptographic Tombstone', enclave: true, signal: false, telegram: false, whatsapp: false, zoom: false }
];

export default function ServicesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'ENCLAVE Ephemeral Secure Communication Services',
    serviceType: 'Encrypted Ephemeral Messaging & Video Conferencing',
    provider: {
      '@type': 'Organization',
      name: 'ENCLAVE',
      url: 'https://enclave.vercel.app'
    },
    description: 'Zero-knowledge ephemeral communication services including WebRTC video calls, blind text relays, and self-destructing file vaults.',
    areaServed: 'Worldwide',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'ENCLAVE Privacy Services',
      itemListElement: serviceCards.map((service, index) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.title,
          description: service.description
        },
        position: index + 1
      }))
    }
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
        <section className="max-w-5xl mx-auto px-6 mb-16 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <Cpu className="w-3.5 h-3.5 text-[#174A3A]" />
            <span>SOLUTIONS & CAPABILITIES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.06]">
            Ephemeral Communication Services & Solutions
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl mx-auto leading-relaxed">
            Purpose-built cryptographic chambers, zero-knowledge blind relays, and memory-only transit designed for conversations that require absolute confidentiality and deliberate endings.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>CREATE A PRIVATE ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/security" className="flex items-center justify-center space-x-2">
                <span>REVIEW CRYPTOGRAPHY</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* 6 Core Services Grid */}
        <section className="max-w-6xl mx-auto px-6 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCards.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col justify-between shadow-xs hover:border-[#C9DDD5] hover:shadow-sm transition-all duration-200"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#174A3A] bg-[#E7F0EC] px-2.5 py-1 rounded border border-[#C9DDD5]">
                        {service.badge}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-[#111111] tracking-tight">
                      {service.title}
                    </h2>

                    <p className="text-sm text-[#666666] leading-relaxed">
                      {service.description}
                    </p>

                    <div className="pt-3 border-t border-[#F0F0EB] space-y-2 text-xs text-[#555555]">
                      {service.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#174A3A] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <Button asChild variant="outline" size="sm" className="w-full text-xs font-mono tracking-wider">
                      <Link href="/app/new">
                        <span>Initialize Chamber &rarr;</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison Matrix Section */}
        <section className="max-w-5xl mx-auto px-6 mb-24">
          <div className="text-center space-y-3 mb-12">
            <div className="text-xs font-mono tracking-widest text-[#174A3A] uppercase font-semibold">
              ARCHITECTURE COMPARISON
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#111111]">
              How ENCLAVE Compares to Traditional Platforms
            </h2>
            <p className="text-base text-[#666666] max-w-2xl mx-auto">
              Mainstream messaging tools retain encrypted archives indefinitely on centralized cloud servers. ENCLAVE leaves zero residual footprint.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E4E4DF] bg-[#FFFFFF] shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E4E4DF] bg-[#F4F4F0] font-mono text-xs uppercase tracking-wider text-[#111111]">
                  <th className="py-4 px-5">Architectural Invariant</th>
                  <th className="py-4 px-4 text-center font-bold text-[#174A3A] bg-[#E7F0EC]/60">ENCLAVE</th>
                  <th className="py-4 px-4 text-center text-[#666666]">Signal</th>
                  <th className="py-4 px-4 text-center text-[#666666]">Telegram</th>
                  <th className="py-4 px-4 text-center text-[#666666]">WhatsApp</th>
                  <th className="py-4 px-4 text-center text-[#666666]">Zoom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4DF]">
                {comparisonData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#111111]">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-center bg-[#E7F0EC]/30">
                      <span className="inline-flex items-center text-[#174A3A] font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1 text-[#174A3A]" /> Yes
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#888888]">
                      {row.signal ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-rose-500 inline" />}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#888888]">
                      {row.telegram ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-rose-500 inline" />}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#888888]">
                      {row.whatsapp ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-rose-500 inline" />}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[#888888]">
                      {row.zoom ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : <XCircle className="w-4 h-4 text-rose-500 inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Global Network Interlink Callout */}
        <section className="max-w-5xl mx-auto px-6 mb-20">
          <div className="p-8 sm:p-10 rounded-2xl bg-[#E7F0EC] border border-[#C9DDD5] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <span className="text-xs font-mono font-bold tracking-widest text-[#174A3A] uppercase">
                GLOBAL EDGE ROUTING
              </span>
              <h3 className="text-2xl font-semibold text-[#111111] tracking-tight">
                Backed by 12 Zero-Retention Edge Points of Presence
              </h3>
              <p className="text-sm text-[#444444] leading-relaxed">
                Explore our low-latency RAM-only relay infrastructure deployed in Frankfurt, Zurich, Singapore, Ashburn, Tokyo, and London.
              </p>
            </div>
            <Button asChild size="lg" className="bg-[#174A3A] hover:bg-[#12382c] text-white shrink-0 text-xs font-mono tracking-wider font-semibold">
              <Link href="/locations" className="flex items-center space-x-2">
                <span>VIEW LOCATIONS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111]">
            Ready to experience zero-trace communication?
          </h2>
          <p className="text-base text-[#666666] max-w-xl mx-auto">
            Initialize an ephemeral chamber in under 5 seconds. No phone number, credit card, or software download required.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/faq" className="flex items-center justify-center space-x-2">
                <span>VIEW FAQ & DOCUMENTATION</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
