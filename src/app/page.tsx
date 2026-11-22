import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/marketing/HeroSection';
import ProductInterfacePreview from '@/components/marketing/ProductInterfacePreview';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Shield,
  HelpCircle,
  CheckCircle2,
  Globe2,
  Video,
  KeyRound,
  ShieldCheck,
  Server,
  Lock,
  ArrowUpRight,
  Terminal,
  Cpu,
  RefreshCw,
  Trash2
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'ENCLAVE | Private by Design',
  description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
  keywords: [
    'ENCLAVE',
    'private by design',
    'ephemeral messaging',
    'private chat room',
    'end to end encrypted video calls',
    'zero retention messaging',
    'browser encrypted rooms',
    'AES-256-GCM',
    'disposable chat'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/',
  },
  openGraph: {
    title: 'ENCLAVE | Private by Design',
    description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
    type: 'website',
    url: 'https://enclave.vercel.app/',
    siteName: 'ENCLAVE',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'ENCLAVE — Private by Design',
      },
      {
        url: 'https://enclave.vercel.app/logo.jpg',
        secureUrl: 'https://enclave.vercel.app/logo.jpg',
        width: 1024,
        height: 1024,
        type: 'image/jpeg',
        alt: 'ENCLAVE Brand Emblem',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ENCLAVE | Private by Design',
    description: "Private, ephemeral, end-to-end encrypted rooms for conversations that don't need to stay.",
    images: ['https://enclave.vercel.app/og-image.png'],
    site: '@enclave',
    creator: '@enclave',
  },
};

const homeFaqs = [
  {
    q: 'How does ENCLAVE differ from Signal or WhatsApp?',
    a: 'Mainstream messaging platforms are built around persistent account identities tied to phone numbers, retaining message histories and session databases on devices by default. ENCLAVE is architected specifically for ephemeral conversations: guests join pairwise chambers without accounts or phone numbers, and messages are relayed through volatile memory without persistent chat databases.'
  },
  {
    q: 'What encryption protocols protect my conversations?',
    a: 'Every message and signaling frame is encrypted locally in your browser using 256-bit AES-GCM with a fresh 96-bit random IV per frame and Signal Double Ratchet forward secrecy. Client passkey derivation utilizes Argon2id (m=32MB client WASM, t=3, p=1) with HKDF-SHA256 domain separation, while server-side account password storage is protected by Argon2id (m=64MB, t=3, p=1).'
  },
  {
    q: 'Can the server read or store my messages?',
    a: 'No. The server operates as a blind relay courier forwarding opaque ciphertext packets without holding decryption keys. Ephemeral room presence and encrypted envelopes are buffered in volatile Redis cache with strict TTL bounds (max 1 hour), and no persistent message transcript database is maintained.'
  },
  {
    q: 'What is the Two-Factor Channel Separation model?',
    a: 'To enter a room, two distinct factors are required: the unique room URL and the secret access pass. Because the access pass is kept out-of-band and never included in the URL, web crawlers and eavesdroppers cannot calculate the chamber key.'
  },
  {
    q: 'Do guests need an app download or account to participate?',
    a: 'No. Counterparties can join directly from any modern web browser without creating accounts or providing phone numbers. They simply choose a display name or pseudonym and enter the room access pass.'
  },
  {
    q: 'Can law enforcement or third parties request my historical chats?',
    a: 'Because ENCLAVE does not retain historical chat transcript databases or decryption keys on its relays, historical message transcripts are not stored for retrieval or surrender.'
  }
];

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ENCLAVE',
    alternateName: ['ENCLAVE Private by Design'],
    url: 'https://enclave.vercel.app/',
    publisher: {
      '@type': 'Organization',
      name: 'ENCLAVE',
      url: 'https://enclave.vercel.app/',
      logo: 'https://enclave.vercel.app/logo.jpg'
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1">
        {/* Approved Human-Crafted Hero */}
        <HeroSection />

        {/* Live Chamber Interface Preview & Wire Telemetry Terminal */}
        <section className="bg-[var(--background)] pb-14 sm:pb-20 -mt-2 sm:-mt-6">
          <ProductInterfacePreview />
        </section>

        {/* HARDENED INVARIANTS TELEMETRY STRIP */}
        <section className="border-y border-[var(--border)] bg-[var(--surface-muted)] py-3 px-6">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[var(--text-secondary)]">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[var(--text-primary)] font-semibold">CIPHER:</span>
              <span>AES-256-GCM + 96-bit CSPRNG IV</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[var(--text-primary)] font-semibold">RATCHET:</span>
              <span>Advancing X25519 Double Ratchet</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[var(--text-primary)] font-semibold">RELAY BUFFER:</span>
              <span>Volatile Redis (1h Max TTL)</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[var(--text-primary)] font-semibold">STORAGE:</span>
              <span className="text-[var(--accent)] font-semibold">Zero Relational Database</span>
            </div>
          </div>
        </section>

        {/* 1. ARCHITECTURAL PROTOCOL LIFECYCLE (4-PHASE SEQUENCE) */}
        <section className="py-20 sm:py-28 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-[11px] font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
                SYSTEM ARCHITECTURE // SPEC 01
              </div>
              <h2 className="font-serif italic text-3xl sm:text-5xl font-normal tracking-tight text-[var(--text-primary)] leading-[1.08]">
                Ephemeral by engineering, not by policy.
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Most platforms offer disappearing timers as a UI layer over persistent databases. ENCLAVE enforces transience at the memory and protocol layer: when a session closes, the cryptographic keys required to decipher past envelopes are physically destroyed.
              </p>
            </div>

            {/* 4-Phase Architectural Schematic */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Phase 1 */}
              <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-5 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[var(--accent)]">PHASE 01</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">GENESIS</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Client Key Derivation
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    Host generates a 256-bit Room Master Secret and cryptographic salt. Passkey derivation runs in local WebCrypto RAM via Argon2id (m=32MB, t=3, p=1). Plaintext keys never touch the network.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                  INVARIANT: Non-exportable CryptoKey
                </div>
              </div>

              {/* Phase 2 */}
              <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-5 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[var(--accent)]">PHASE 02</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">AUTH GATE</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Two-Channel Separation
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    Room URL and passkey are transmitted via disjoint channels. Possession of the link alone grants zero entry. The blind relay verifies one-way argon hashes without ever seeing the pass.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                  INVARIANT: Passkey excluded from URL/logs
                </div>
              </div>

              {/* Phase 3 */}
              <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-5 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[var(--accent)]">PHASE 03</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">IN-FLIGHT</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Advancing Double Ratchet
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    Counterparties exchange signed X25519 prekeys. Every message advances root and sending/receiving chains. Fresh 96-bit CSPRNG nonces guarantee forward secrecy and break-in recovery.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                  INVARIANT: Pairwise boundary enforced
                </div>
              </div>

              {/* Phase 4 */}
              <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-5 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[var(--accent)]">PHASE 04</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">SHRED</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Definitive Zeroization
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                    Departure or inactivity triggers an atomic Redis tombstone eviction. Client key buffers are overwritten with CSPRNG noise prior to GC. The room dissolves permanently.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                  INVARIANT: Zero post-session resurrection
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between pt-6 border-t border-[var(--border)] text-xs font-mono">
              <Link
                href="/how-it-works"
                className="inline-flex items-center space-x-2 text-[var(--accent)] hover:underline font-semibold"
              >
                <span>Read the complete mathematical protocol breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <span className="hidden sm:inline text-[var(--text-muted)]">
                SPEC-VER-5.3 // FORMAL VERIFICATION PASSED
              </span>
            </div>
          </div>
        </section>

        {/* 2. ARCHITECTURAL INVARIANTS LEDGER (SWISS SPECIFICATION COMPARISON) */}
        <section className="py-20 sm:py-28 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-[11px] font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
                ARCHITECTURAL COMPARISON // SPEC 02
              </div>
              <h2 className="font-serif italic text-3xl sm:text-5xl font-normal tracking-tight text-[var(--text-primary)] leading-[1.08]">
                Persistent platforms vs. Ephemeral chambers.
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Conventional messengers are designed to build permanent communication archives across personal devices. ENCLAVE is engineered for the opposite: zero historical footprint.
              </p>
            </div>

            {/* Swiss Engineering Comparison Ledger */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]">
                      <th className="py-3.5 px-6 uppercase tracking-wider font-semibold">Architectural Dimension</th>
                      <th className="py-3.5 px-6 uppercase tracking-wider font-semibold">Persistent Messengers (Signal / WhatsApp)</th>
                      <th className="py-3.5 px-6 uppercase tracking-wider font-semibold text-[var(--accent)]">ENCLAVE Ephemeral Chamber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Guest Identity</td>
                      <td className="py-4 px-6">Tied to verified phone numbers &amp; public key databases.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">Zero account or phone number required. Counterparties enter a display name &amp; passkey.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Message Persistence</td>
                      <td className="py-4 px-6">Stored in local device SQLite DBs and optional cloud backups.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">Zero message transcript database maintained anywhere.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Relay Architecture</td>
                      <td className="py-4 px-6">Persistent server queues with push notification routing.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">Blind volatile couriers; in-memory buffer with strict 1h TTL.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Session Dissolution</td>
                      <td className="py-4 px-6">Disappearing timer flags delete rows; metadata remains.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">Full RAM key shredding; room tombstone prevents resurrection.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Endpoint Footprint</td>
                      <td className="py-4 px-6">Native application install with background permissions.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">Browser-native WebCrypto execution; zero installation footprint.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 font-semibold text-[var(--text-primary)]">Subpoena &amp; Forensics</td>
                      <td className="py-4 px-6">Device forensic extraction recovers historical database.</td>
                      <td className="py-4 px-6 text-[var(--accent)] font-semibold">No historical database exists to compel, subpoena, or leak.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CAPABILITIES SPREAD (ARCHITECTURAL GRID) */}
        <section className="py-20 sm:py-28 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-14 space-y-3">
              <div className="text-[11px] font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
                SYSTEM CAPABILITIES // SPEC 03
              </div>
              <h2 className="font-serif italic text-3xl sm:text-5xl font-normal tracking-tight text-[var(--text-primary)] leading-[1.08]">
                Engineered for sensitive disclosures.
              </h2>
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                Whether negotiating confidential transactions, reviewing sensitive contracts, or conducting secure research interviews, ENCLAVE provides purpose-built tools for zero-leak workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="p-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <Video className="w-4 h-4" />
                    <span>01 // P2P AUDIO &amp; VIDEO CALLING</span>
                  </div>
                  <h3 className="font-serif italic text-2xl font-normal text-[var(--text-primary)] tracking-tight">
                    Encrypted voice &amp; video conferences
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                    Direct peer-to-peer WebRTC connections with end-to-end encrypted signaling. Audio and video streams bypass central recording servers entirely, terminating cleanly upon hangup.
                  </p>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-muted)]">DTLS-SRTP P2P</span>
                  <Link href="/services" className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>02 // VIEW-ONCE RAM DROPS</span>
                  </div>
                  <h3 className="font-serif italic text-2xl font-normal text-[var(--text-primary)] tracking-tight">
                    Ephemeral document &amp; media transfer
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                    Send view-once documents, credentials, and attachments. Payload ciphertext is decrypted directly into client RAM, displayed on-screen, and zeroized immediately upon closure.
                  </p>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-muted)]">RAM-Only Decryption</span>
                  <Link href="/services" className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <Globe2 className="w-4 h-4" />
                    <span>03 // GLOBAL VOLATILE RELAYS</span>
                  </div>
                  <h3 className="font-serif italic text-2xl font-normal text-[var(--text-primary)] tracking-tight">
                    Blind edge couriers across 14 regions
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                    Edge nodes forward opaque envelopes without access to room passkeys. Envelopes reside exclusively in volatile memory buffers with strict 1-hour expiration timeouts.
                  </p>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-muted)]">TLS 1.3 + Opaque Couriers</span>
                  <Link href="/locations" className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold">
                    <span>Explore topology</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-7 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)]">
                    <Trash2 className="w-4 h-4" />
                    <span>04 // ANTI-RESURRECTION TOMBSTONES</span>
                  </div>
                  <h3 className="font-serif italic text-2xl font-normal text-[var(--text-primary)] tracking-tight">
                    Irreversible chamber dissolution
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
                    When participants depart, an atomic tombstone locks the chamber identifier permanently. Any subsequent join attempt receives an immutable 410 Gone error.
                  </p>
                </div>
                <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--text-muted)]">Atomic Lua Lockout</span>
                  <Link href="/security" className="text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold">
                    <span>Security specs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOME INTERACTIVE KNOWLEDGE BASE */}
        <section className="py-20 sm:py-28 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="max-w-3xl mx-auto px-6 space-y-10">
            <div className="space-y-2">
              <div className="text-[11px] font-mono tracking-widest text-[var(--accent)] uppercase font-semibold">
                KNOWLEDGE BASE // VERIFIED SPECS
              </div>
              <h2 className="font-serif italic text-3xl sm:text-4xl font-normal tracking-tight text-[var(--text-primary)]">
                Frequently Answered Inquiries
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)]">
                Key questions regarding our cryptographic implementation, room lifecycle, and zero-retention model.
              </p>
            </div>

            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {homeFaqs.map((faq, fIdx) => (
                <details
                  key={fIdx}
                  className="group py-5 transition-colors"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none text-base font-medium text-[var(--text-primary)] group-open:text-[var(--accent)]">
                    <span className="pr-4">{faq.q}</span>
                    <span className="shrink-0 text-lg font-mono text-[var(--text-muted)] group-open:rotate-45 transition-transform duration-150">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed pr-6 font-sans">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/faq"
                className="inline-flex items-center text-xs font-mono font-semibold text-[var(--accent)] hover:underline gap-1.5"
              >
                <span>Read all answers in our complete Knowledge Base &amp; FAQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. RESTRAINED CALL TO ACTION */}
        <section className="py-20 sm:py-28 px-6 text-center bg-[var(--background)]">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-sm bg-[var(--surface-muted)] border border-[var(--border)] text-[10px] sm:text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
              <span>ZERO TRACE AFTER EXIT</span>
            </div>

            <h2 className="font-serif italic text-3xl sm:text-5xl font-normal tracking-tight text-[var(--text-primary)]">
              Ready to converse in private?
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed text-balance">
              Initialize an ephemeral chamber in seconds. Counterparties enter their display name and passkey to join with zero accounts or software downloads.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.99] transition-all"
              >
                <Link href="/app/new" className="flex items-center justify-center space-x-2">
                  <span>INITIALIZE A CHAMBER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-7 h-12 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)] transition-all"
              >
                <Link href="/app" className="flex items-center justify-center space-x-2">
                  <span>ENTER WITH PASSKEY</span>
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
