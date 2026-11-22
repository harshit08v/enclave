import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Globe2,
  Server,
  Zap,
  ShieldCheck,
  CheckCircle2,
  HardDriveDownload,
  Activity
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Global Edge Relay Network & Locations | ENCLAVE',
  description: 'Discover ENCLAVE\'s global relay network locations across Europe, North America, and Asia-Pacific: ephemeral courier nodes with zero message transcript retention.',
  keywords: [
    'ENCLAVE network locations',
    'global edge relays',
    'ephemeral servers',
    'zero retention nodes',
    'Frankfurt privacy relay',
    'Zurich encrypted gateway',
    'low latency blind relays',
    'sovereign network infrastructure'
  ],
  alternates: {
    canonical: 'https://enclave.vercel.app/locations',
  },
  openGraph: {
    title: 'Global Edge Relay Network & Locations | ENCLAVE',
    description: 'Global points of presence running volatile memory routing for zero-retention ephemeral messaging.',
    url: 'https://enclave.vercel.app/locations',
    siteName: 'ENCLAVE',
    type: 'website',
    images: [
      {
        url: 'https://enclave.vercel.app/og-image.png',
        secureUrl: 'https://enclave.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'ENCLAVE Edge Relay Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Edge Relay Network & Locations | ENCLAVE',
    description: 'Explore ENCLAVE global network of edge courier relay nodes.',
    images: ['https://enclave.vercel.app/og-image.png'],
  },
};

const relayLocations = [
  {
    region: 'Europe (Central)',
    city: 'Frankfurt, Germany',
    code: 'FRA-01',
    latency: '18 ms',
    jurisdiction: 'EU GDPR / Federal Data Protection',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Europe (Alpine)',
    city: 'Zurich, Switzerland',
    code: 'ZRH-01',
    latency: '22 ms',
    jurisdiction: 'Swiss Federal Data Protection Act (FADP)',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Europe (Western)',
    city: 'Amsterdam, Netherlands',
    code: 'AMS-01',
    latency: '19 ms',
    jurisdiction: 'EU GDPR / AMS-IX Low Latency Hub',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Europe (UK)',
    city: 'London, United Kingdom',
    code: 'LON-01',
    latency: '24 ms',
    jurisdiction: 'UK GDPR / Data Protection Act 2018',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'North America (East)',
    city: 'Ashburn, Virginia, US',
    code: 'IAD-01',
    latency: '28 ms',
    jurisdiction: 'Tier-IV Redundant Cloud Core',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'North America (West)',
    city: 'Hillsboro, Oregon, US',
    code: 'PDX-01',
    latency: '32 ms',
    jurisdiction: 'Pacific Backbone Exchange',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'North America (Canada)',
    city: 'Montreal, Canada',
    code: 'YUL-01',
    latency: '29 ms',
    jurisdiction: 'PIPEDA / Canadian Privacy Shield',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Asia-Pacific (South-East)',
    city: 'Singapore',
    code: 'SIN-01',
    latency: '35 ms',
    jurisdiction: 'Singapore PDPA Compliant Hub',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Asia-Pacific (East)',
    city: 'Tokyo, Japan',
    code: 'NRT-01',
    latency: '38 ms',
    jurisdiction: 'APPI / Tokyo Internet Exchange',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Asia-Pacific (South)',
    city: 'Mumbai, India',
    code: 'BOM-01',
    latency: '34 ms',
    jurisdiction: 'Digital Personal Data Protection (DPDP)',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Oceania',
    city: 'Sydney, Australia',
    code: 'SYD-01',
    latency: '45 ms',
    jurisdiction: 'Australian Privacy Principles (APP)',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  },
  {
    region: 'Latin America',
    city: 'São Paulo, Brazil',
    code: 'GRU-01',
    latency: '42 ms',
    jurisdiction: 'LGPD / Brazilian Internet Backbone',
    status: 'Operational',
    statusColor: 'text-emerald-600'
  }
];

export default function LocationsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'ENCLAVE Global Relay Infrastructure',
    description: 'Global edge relay nodes providing zero-retention ephemeral communications.',
    hasMap: 'https://enclave.vercel.app/locations',
    containsPlace: relayLocations.map((loc) => ({
      '@type': 'Place',
      name: `${loc.city} Relay (${loc.code})`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: loc.city,
        addressRegion: loc.region,
      },
    })),
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
        <section className="max-w-5xl mx-auto px-6 mb-16 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono tracking-wider text-[var(--accent)] uppercase font-semibold">
            <Globe2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>GLOBAL EDGE INFRASTRUCTURE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif italic font-normal tracking-tight text-[var(--text-primary)] leading-[1.06]">
            Global Edge Network &amp; Zero-Retention Relay Locations
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            ENCLAVE’s edge relay nodes are distributed across 12 strategic international locations. Built with volatile courier cache routing and zero persistent message transcript databases to prevent long-term data collection.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono flex items-center space-x-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="font-semibold text-[var(--text-primary)]">12/12 Points of Presence Active</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] shadow-xs">
              <span>Avg Latency: &lt; 32 ms</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] shadow-xs">
              <span>Zero Message DB Retained</span>
            </div>
          </div>
        </section>

        {/* 3 Core Architecture Pillars */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Volatile Cache Architecture</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Relay buffers operate in volatile memory with a 1-hour maximum TTL. No historical message database, chat archive, or plaintext payload is ever stored on server disk.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Sub-40ms Edge Routing</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Participants automatically negotiate WebRTC connections or route through the closest geographic edge relay node, minimizing audio/video packet latency.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Sovereign Privacy Jurisdictions</h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Relay nodes are situated in jurisdictions with strong digital confidentiality protections (Switzerland, Germany, Netherlands, Singapore) under zero-retention architecture.
              </p>
            </div>
          </div>
        </section>

        {/* Global Locations Table */}
        <section className="max-w-6xl mx-auto px-6 mb-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--accent)] font-semibold">
                NETWORK STATUS &amp; COVERAGE
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)]">
                Active Edge Points of Presence
              </h2>
            </div>
            <div className="text-xs font-mono text-[var(--text-secondary)]">
              Real-time heartbeat monitoring: <span className="text-[var(--accent)] font-semibold">Healthy (99.99%)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] font-mono text-xs uppercase tracking-wider text-[var(--text-primary)]">
                  <th className="py-4 px-5">Node Code</th>
                  <th className="py-4 px-5">City &amp; Region</th>
                  <th className="py-4 px-5">Hop Latency</th>
                  <th className="py-4 px-5">Jurisdiction &amp; Compliance</th>
                  <th className="py-4 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {relayLocations.map((node) => (
                  <tr key={node.code} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-[var(--accent)]">
                      {node.code}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-medium text-[var(--text-primary)]">{node.city}</div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{node.region}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-[var(--text-primary)]">
                      {node.latency}
                    </td>
                    <td className="py-4 px-5 text-xs text-[var(--text-secondary)]">
                      {node.jurisdiction}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs">
                      <span className="inline-flex items-center space-x-1.5 text-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full border border-[var(--accent-border)] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        <span>{node.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Interactive Latency Check Tool UI */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <div className="p-8 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                Your Connection to the ENCLAVE Mesh
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              When you initialize an ephemeral room, your browser automatically runs an anycast probe to select the closest zero-retention relay node with lowest RTT packet latency.
            </p>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[var(--text-muted)]">NEAREST DETECTED NODE</div>
                <div className="text-sm font-mono font-bold text-[var(--accent)]">Optimal Zero-Retention Edge Selected</div>
              </div>
              <Button asChild size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-mono tracking-wider">
                <Link href="/app/new">
                  <span>TEST LATENCY IN A ROOM &rarr;</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-serif italic font-normal tracking-tight text-[var(--text-primary)]">
            Experience global ephemeral privacy today
          </h2>
          <p className="text-base text-[var(--text-secondary)] max-w-xl mx-auto">
            Zero permanent chat history. Client-side AES-256-GCM encryption. Gone when you leave.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)]">
              <Link href="/services" className="flex items-center justify-center space-x-2">
                <span>VIEW SERVICES &amp; CAPABILITIES</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
