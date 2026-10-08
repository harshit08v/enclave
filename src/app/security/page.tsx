'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SecurityArchitectureSection from '@/components/marketing/SecurityArchitectureSection';
import HonestSecuritySection from '@/components/marketing/HonestSecuritySection';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type SecurityTab = 'architecture' | 'threat-model' | 'cryptography' | 'comparison';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('architecture');

  const tabs: { id: SecurityTab; label: string }[] = [
    { id: 'architecture', label: 'Layered Architecture' },
    { id: 'threat-model', label: 'Threat Model & Scope' },
    { id: 'cryptography', label: 'Cryptographic Specs' },
    { id: 'comparison', label: 'Architecture Comparison' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        {/* Header Hero */}
        <section className="max-w-7xl mx-auto px-6 mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E7F0EC] border border-[#C9DDD5] text-[11px] font-mono tracking-wider text-[#174A3A] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#174A3A]" />
            <span>SECURITY SPECIFICATION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-[#111111] leading-[1.08]">
            Security Architecture & <br />
            <span className="text-[#8A8A8A] font-normal">Threat Model</span>
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-3xl leading-relaxed">
            ENCLAVE uses standard W3C Web Cryptography primitives to enforce a zero-knowledge, zero-persistence model. We publish our mathematical assumptions, cryptographic standards, and formal boundaries.
          </p>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-6 border-b border-[#E4E4DF] pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#174A3A] text-white font-semibold shadow-xs'
                    : 'bg-[#FFFFFF] text-[#666666] hover:text-[#174A3A] hover:bg-[#F4F4F0] border border-[#E4E4DF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tab 1: Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-12">
            <SecurityArchitectureSection />
            <HonestSecuritySection />
          </div>
        )}

        {/* Tab 2: Threat Model */}
        {activeTab === 'threat-model' && (
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-8 space-y-8 shadow-xs">
              <div>
                <h3 className="text-2xl font-medium text-[#111111] tracking-tight">
                  Adversary Capabilities & Mitigations
                </h3>
                <p className="text-sm text-[#666666] mt-1">
                  Our formal security goals defined against specific threat actors.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E4DF] text-[#8A8A8A]">
                      <th className="py-3 px-4 uppercase tracking-wider">Adversary Profile</th>
                      <th className="py-3 px-4 uppercase tracking-wider">Adversary Capabilities</th>
                      <th className="py-3 px-4 uppercase tracking-wider">ENCLAVE Defenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4DF] text-[#666666]">
                    <tr>
                      <td className="py-4 px-4 font-semibold text-[#111111]">Hostile Relay Server</td>
                      <td className="py-4 px-4">Can intercept, inspect, drop, or log all network payloads.</td>
                      <td className="py-4 px-4 text-[#174A3A] font-semibold">Client-side AES-256-GCM. Passphrases are hashed one-way (zero plaintext pass sent).</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-[#111111]">Network Eavesdropper (MITM)</td>
                      <td className="py-4 px-4">Monitors public Wi-Fi, ISP routers, or fiber taps.</td>
                      <td className="py-4 px-4 text-[#174A3A] font-semibold">TLS 1.3 + Application-layer AES-256-GCM. Access pass is never in URL, headers, or referrers.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-[#111111]">URL Scraper / Browser History</td>
                      <td className="py-4 px-4">Obtains the public room link via clipboard or history.</td>
                      <td className="py-4 px-4 text-[#174A3A] font-semibold">Possession of URL alone grants zero entry. Pass is required out-of-band.</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-semibold text-[#111111]">Post-Session Subpoena</td>
                      <td className="py-4 px-4">Demands server logs, hard drives, or cloud snapshots.</td>
                      <td className="py-4 px-4 text-[#174A3A] font-semibold">Rooms are destroyed upon exit. No message archive or key database exists.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Boundaries Box */}
            <div className="bg-[#F4F4F0] border border-[#E4E4DF] rounded-xl p-8 space-y-4">
              <div className="text-xs font-mono text-[#174A3A] uppercase tracking-wider font-semibold">
                EXPLICIT OUT-OF-SCOPE BOUNDARIES
              </div>
              <h4 className="text-xl font-medium text-[#111111]">
                Mathematics Protects the Wire, Not Compromised Endpoints
              </h4>
              <p className="text-sm text-[#666666] leading-relaxed">
                If an adversary has physical access to your device display, uses an external camera, or has root-level kernel malware on your operating system, no cryptographic protocol can prevent interception. ENCLAVE is engineered for secure endpoints communicating over untrusted networks.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Cryptography */}
        {activeTab === 'cryptography' && (
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-4 font-mono text-xs shadow-xs">
                <div className="text-xs text-[#174A3A] uppercase tracking-wider font-semibold">
                  Key Derivation
                </div>
                <h3 className="text-lg font-semibold text-[#111111]">
                  PBKDF2-HMAC-SHA256
                </h3>
                <p className="text-xs text-[#666666] font-sans leading-relaxed">
                  Passphrases undergo 100,000 iterations of HMAC-SHA256 with a freshly generated 128-bit cryptographic salt:
                </p>
                <div className="p-4 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] text-xs text-[#174A3A] break-all font-bold">
                  MasterSecret = PBKDF2(Passphrase, Salt, 100000, 512, &apos;SHA-256&apos;)
                </div>
              </div>

              <div className="p-8 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] space-y-4 font-mono text-xs shadow-xs">
                <div className="text-xs text-[#174A3A] uppercase tracking-wider font-semibold">
                  Authenticated Encryption
                </div>
                <h3 className="text-lg font-semibold text-[#111111]">
                  AES-256-GCM
                </h3>
                <p className="text-xs text-[#666666] font-sans leading-relaxed">
                  Payloads are encrypted with 256-bit AES-GCM. A fresh 96-bit IV nonce is generated for every packet to prevent replay:
                </p>
                <div className="p-4 rounded-lg bg-[#E7F0EC] border border-[#C9DDD5] text-xs text-[#174A3A] break-all font-bold">
                  Ciphertext, Tag = AES_256_GCM_Encrypt(Key, IV_96, Plaintext)
                </div>
              </div>
            </div>

            {/* Zeroization Card */}
            <div className="p-8 rounded-xl bg-[#F4F4F0] border border-[#E4E4DF] space-y-3">
              <h3 className="text-lg font-mono font-semibold text-[#111111]">
                Memory Zeroization & Session Scoping
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed">
                When a user leaves a room or closes the browser window, all CryptoKey references are dropped and buffers are overwritten with CSPRNG noise prior to garbage collection. Keys are never saved to disk, sessionStorage, or IndexedDB.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Comparison */}
        {activeTab === 'comparison' && (
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-[#FFFFFF] border border-[#E4E4DF] rounded-xl p-8 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[#E4E4DF] text-[#8A8A8A]">
                    <th className="py-3 px-4 uppercase tracking-wider">Feature</th>
                    <th className="py-3 px-4 uppercase tracking-wider text-[#174A3A] font-bold">ENCLAVE</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Signal</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Telegram</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4DF] text-[#666666]">
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[#111111]">Permanent Chat History</td>
                    <td className="py-4 px-4 text-[#174A3A] font-bold">None (Destroyed on Leave)</td>
                    <td className="py-4 px-4">Local Device DB</td>
                    <td className="py-4 px-4">Cloud Server DB</td>
                    <td className="py-4 px-4">Homeserver DB</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[#111111]">Identity Registration</td>
                    <td className="py-4 px-4 text-[#174A3A] font-bold">Ephemeral Pass / Room</td>
                    <td className="py-4 px-4">Phone Number</td>
                    <td className="py-4 px-4">Phone Number</td>
                    <td className="py-4 px-4">Username / Server</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[#111111]">URL / Pass Separation</td>
                    <td className="py-4 px-4 text-[#174A3A] font-bold">Strictly Two Channels</td>
                    <td className="py-4 px-4">N/A (Account-based)</td>
                    <td className="py-4 px-4">Single Join Link</td>
                    <td className="py-4 px-4">Single Room Alias</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[#111111]">Server Plaintext Storage</td>
                    <td className="py-4 px-4 text-[#174A3A] font-bold">Zero (Blind Courier)</td>
                    <td className="py-4 px-4">Zero</td>
                    <td className="py-4 px-4">Default Cloud Storage</td>
                    <td className="py-4 px-4">Encrypted (if Megolm)</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[#111111]">Destruction Guarantee</td>
                    <td className="py-4 px-4 text-[#174A3A] font-bold">Automatic upon final exit</td>
                    <td className="py-4 px-4">Disappearing Timer</td>
                    <td className="py-4 px-4">Secret Chat Timer</td>
                    <td className="py-4 px-4">Manual Redaction</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <section className="max-w-7xl mx-auto px-6 mt-20 pt-12 border-t border-[#E4E4DF] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-medium text-[#111111]">
              Ready to create a private Enclave?
            </h3>
            <p className="text-xs text-[#666666] mt-1 font-mono">
              Zero logs. Separate access pass. Instant dissolution.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/signup" className="flex items-center space-x-2">
              <span>START CHATTING</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
