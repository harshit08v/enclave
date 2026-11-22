'use client';

import React, { useState } from 'react';
import SecurityArchitectureSection from '@/components/marketing/SecurityArchitectureSection';
import HonestSecuritySection from '@/components/marketing/HonestSecuritySection';

type SecurityTab = 'architecture' | 'threat-model' | 'cryptography' | 'comparison';

export default function SecurityClientView() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('architecture');

  const tabs: { id: SecurityTab; label: string }[] = [
    { id: 'architecture', label: 'Layered Architecture' },
    { id: 'threat-model', label: 'Threat Model & Scope' },
    { id: 'cryptography', label: 'Cryptographic Specs' },
    { id: 'comparison', label: 'Architecture Comparison' },
  ];

  return (
    <div className="space-y-12">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-b border-[var(--border)] pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-white font-semibold shadow-xs'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--surface-muted)] border border-[var(--border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Architecture */}
      {activeTab === 'architecture' && (
        <div className="space-y-12">
          <SecurityArchitectureSection />
          <HonestSecuritySection />
        </div>
      )}

      {/* Tab 2: Threat Model */}
      {activeTab === 'threat-model' && (
        <div className="space-y-12">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 space-y-8 shadow-xs">
            <div>
              <h3 className="text-2xl font-medium text-[var(--text-primary)] tracking-tight">
                Adversary Capabilities & Mitigations
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Our formal security invariants evaluated against specific threat actors.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="py-3 px-4 uppercase tracking-wider">Adversary Profile</th>
                    <th className="py-3 px-4 uppercase tracking-wider">Adversary Capabilities</th>
                    <th className="py-3 px-4 uppercase tracking-wider">ENCLAVE Defenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Hostile Relay Server</td>
                    <td className="py-4 px-4">Can intercept, inspect, drop, or log all network payloads.</td>
                    <td className="py-4 px-4 text-[var(--accent)] font-semibold">Client-side AES-256-GCM. Passphrases are hashed one-way (zero plaintext pass sent).</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Network Eavesdropper (MITM)</td>
                    <td className="py-4 px-4">Monitors public Wi-Fi, ISP routers, or fiber taps.</td>
                    <td className="py-4 px-4 text-[var(--accent)] font-semibold">TLS 1.3 + Application-layer AES-256-GCM. Access pass is never in URL, headers, or referrers.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">URL Scraper / Browser History</td>
                    <td className="py-4 px-4">Obtains the public room link via clipboard or history.</td>
                    <td className="py-4 px-4 text-[var(--accent)] font-semibold">Possession of URL alone grants zero entry. Pass is required out-of-band.</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Post-Session Subpoena</td>
                    <td className="py-4 px-4">Demands server logs, hard drives, or cloud snapshots.</td>
                    <td className="py-4 px-4 text-[var(--accent)] font-semibold">Rooms are destroyed upon exit. No message archive or key database exists.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Boundaries Box */}
          <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-8 space-y-4">
            <div className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">
              EXPLICIT OUT-OF-SCOPE BOUNDARIES
            </div>
            <h4 className="text-xl font-medium text-[var(--text-primary)]">
              Mathematics Protects the Wire, Not Compromised Endpoints
            </h4>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              If an adversary has physical access to your device display, uses an external camera, or has root-level kernel malware on your operating system, no cryptographic protocol can prevent interception. ENCLAVE is engineered for secure endpoints communicating over untrusted networks.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Cryptography */}
      {activeTab === 'cryptography' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 font-mono text-xs shadow-xs">
              <div className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold">
                Key Derivation Schedule
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Argon2id + HKDF-SHA256
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Passphrases undergo memory-hard Argon2id derivation (m=32MB, t=3, p=1) with a freshly generated 128-bit cryptographic salt:
              </p>
              <div className="p-4 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs text-[var(--accent)] break-all font-bold">
                PDK = Argon2id(Passphrase, Salt); KWK = HKDF(PDK)
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4 font-mono text-xs shadow-xs">
              <div className="text-xs text-[var(--accent)] uppercase tracking-wider font-semibold">
                Authenticated Payload Encryption
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                AES-256-GCM
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
                Payloads are encrypted with 256-bit AES-GCM. A fresh 96-bit random IV nonce is generated for every packet to prevent replay:
              </p>
              <div className="p-4 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs text-[var(--accent)] break-all font-bold">
                Ciphertext, Tag = AES_256_GCM_Encrypt(Key, IV_96, Plaintext)
              </div>
            </div>
          </div>

          {/* Zeroization Card */}
          <div className="p-8 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-3">
            <h3 className="text-lg font-mono font-semibold text-[var(--text-primary)]">
              Memory Zeroization & Session Scoping
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              When a user leaves a room or closes the browser window, all CryptoKey references are dropped and buffers are overwritten with CSPRNG noise prior to garbage collection. Keys are never saved to disk, sessionStorage, or IndexedDB.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Comparison */}
      {activeTab === 'comparison' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="py-3 px-4 uppercase tracking-wider">Feature</th>
                <th className="py-3 px-4 uppercase tracking-wider text-[var(--accent)] font-bold">ENCLAVE</th>
                <th className="py-3 px-4 uppercase tracking-wider">Signal</th>
                <th className="py-3 px-4 uppercase tracking-wider">Telegram</th>
                <th className="py-3 px-4 uppercase tracking-wider">Matrix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Permanent Chat History</td>
                <td className="py-4 px-4 text-[var(--accent)] font-bold">None (Destroyed on Leave)</td>
                <td className="py-4 px-4">Local Device DB</td>
                <td className="py-4 px-4">Cloud Server DB</td>
                <td className="py-4 px-4">Homeserver DB</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Identity Registration</td>
                <td className="py-4 px-4 text-[var(--accent)] font-bold">Ephemeral Pass / Room</td>
                <td className="py-4 px-4">Phone Number</td>
                <td className="py-4 px-4">Phone Number</td>
                <td className="py-4 px-4">Username / Server</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">URL / Pass Separation</td>
                <td className="py-4 px-4 text-[var(--accent)] font-bold">Strictly Two Channels</td>
                <td className="py-4 px-4">N/A (Account-based)</td>
                <td className="py-4 px-4">Single Join Link</td>
                <td className="py-4 px-4">Single Room Alias</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Server Plaintext Storage</td>
                <td className="py-4 px-4 text-[var(--accent)] font-bold">Zero (Blind Courier)</td>
                <td className="py-4 px-4">Zero</td>
                <td className="py-4 px-4">Default Cloud Storage</td>
                <td className="py-4 px-4">Encrypted (if Megolm)</td>
              </tr>
              <tr>
                <td className="py-4 px-4 font-semibold text-[var(--text-primary)]">Destruction Guarantee</td>
                <td className="py-4 px-4 text-[var(--accent)] font-bold">Automatic upon final exit</td>
                <td className="py-4 px-4">Disappearing Timer</td>
                <td className="py-4 px-4">Secret Chat Timer</td>
                <td className="py-4 px-4">Manual Redaction</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
