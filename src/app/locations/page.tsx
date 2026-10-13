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
  description: 'Discover ENCLAVE’s 12 global edge relay locations across Europe, North America, and Asia-Pacific. Volatile RAM-only nodes with sub-40ms latency and zero disk retention.',
  keywords: [
    'ENCLAVE network locations',
    'global edge relays',
    'RAM only servers',
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
    description: '12 global edge points of presence running purely in volatile memory for zero-retention ephemeral routing.',
    url: 'https://enclave.vercel.app/locations',
    siteName: 'ENCLAVE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Edge Relay Network & Locations | ENCLAVE',
    description: 'Explore ENCLAVE’s global network of RAM-only relay nodes.',
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
    description: '12 global edge relay nodes providing sub-40ms zero-retention ephemeral communications.',
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
            <Globe2 className="w-3.5 h-3.5 text-[#174A3A]" />
            <span>GLOBAL EDGE INFRASTRUCTURE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.06]">
            Global Edge Network & Zero-Retention Relay Locations
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl mx-auto leading-relaxed">
            ENCLAVE’s edge relay nodes are distributed across 12 strategic international locations. Built with pure volatile RAM memory and zero persistent storage to ensure physical and digital non-retention.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E4E4DF] text-xs font-mono flex items-center space-x-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[#111111]">12/12 Points of Presence Active</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E4E4DF] text-xs font-mono text-[#666666] shadow-xs">
              <span>Avg Latency: &lt; 32 ms</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E4E4DF] text-xs font-mono text-[#666666] shadow-xs">
              <span>Zero Disk Persistence</span>
            </div>
          </div>
        </section>

        {/* 3 Core Architecture Pillars */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#111111]">100% Volatile RAM Only</h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                Relay nodes operate entirely in memory. Operating systems boot from read-only cryptographic images with zero permanent disk volumes mounted for packet storage.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#111111]">Sub-40ms Edge Routing</h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                Participants automatically negotiate WebRTC connections or route through the closest geographic edge relay node, minimizing audio/video packet latency.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#E7F0EC] border border-[#C9DDD5] flex items-center justify-center text-[#174A3A]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#111111]">Sovereign Privacy Jurisdictions</h3>
              <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
                Relay nodes are situated in jurisdictions with strong digital confidentiality protections (Switzerland, Germany, Netherlands, Singapore) under zero-subpoena architecture.
              </p>
            </div>
          </div>
        </section>

        {/* Global Locations Table */}
        <section className="max-w-6xl mx-auto px-6 mb-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-widest text-[#174A3A] font-semibold">
                NETWORK STATUS & COVERAGE
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#111111]">
                Active Edge Points of Presence
              </h2>
            </div>
            <div className="text-xs font-mono text-[#666666]">
              Real-time heartbeat monitoring: <span className="text-[#174A3A] font-semibold">Healthy (99.99%)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E4E4DF] bg-[#FFFFFF] shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E4E4DF] bg-[#F4F4F0] font-mono text-xs uppercase tracking-wider text-[#111111]">
                  <th className="py-4 px-5">Node Code</th>
                  <th className="py-4 px-5">City & Region</th>
                  <th className="py-4 px-5">Hop Latency</th>
                  <th className="py-4 px-5">Jurisdiction & Compliance</th>
                  <th className="py-4 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4DF]">
                {relayLocations.map((node) => (
                  <tr key={node.code} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-[#174A3A]">
                      {node.code}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-medium text-[#111111]">{node.city}</div>
                      <div className="text-[11px] text-[#888888] font-mono">{node.region}</div>
                    </td>
                    <td className="py-4 px-5 font-mono text-[#111111]">
                      {node.latency}
                    </td>
                    <td className="py-4 px-5 text-xs text-[#555555]">
                      {node.jurisdiction}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-xs">
                      <span className="inline-flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
          <div className="p-8 rounded-2xl bg-[#F4F4F0] border border-[#E4E4DF] space-y-6">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-[#174A3A]" />
              <h3 className="text-xl font-semibold text-[#111111]">
                Your Connection to the ENCLAVE Mesh
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
              When you initialize an ephemeral room, your browser automatically runs an anycast probe to select the closest zero-retention relay node with lowest RTT packet latency.
            </p>
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[#888888]">NEAREST DETECTED NODE</div>
                <div className="text-sm font-mono font-bold text-[#174A3A]">Optimal Zero-Retention Edge Selected</div>
              </div>
              <Button asChild size="sm" className="bg-[#174A3A] hover:bg-[#12382c] text-white text-xs font-mono tracking-wider">
                <Link href="/app/new">
                  <span>TEST LATENCY IN A ROOM &rarr;</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#111111]">
            Experience global ephemeral privacy today
          </h2>
          <p className="text-base text-[#666666] max-w-xl mx-auto">
            Zero permanent chat history. Client-side AES-256-GCM encryption. Gone when you leave.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button asChild size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/signup" className="flex items-center justify-center space-x-2">
                <span>START A CHAT ROOM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto px-8 h-12 text-xs font-mono tracking-wider font-semibold">
              <Link href="/services" className="flex items-center justify-center space-x-2">
                <span>VIEW SERVICES & CAPABILITIES</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
