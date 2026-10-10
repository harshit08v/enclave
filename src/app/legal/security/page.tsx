import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Lock, ShieldCheck, KeyRound, Server, AlertTriangle, Cpu, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Security & Encryption Policy · ENCLAVE Legal Center',
  description: 'Technical, cryptographic, and operational specifications of ENCLAVE’s client-side zero-knowledge encryption architecture.'
};

const TOC = [
  { id: 'security-philosophy', title: 'Security Architecture Philosophy' },
  { id: 'cryptographic-primitives', title: 'Cryptographic Primitives & Specifications' },
  { id: 'key-hierarchy', title: 'Key Hierarchy & Derivation Flow' },
  { id: 'aad-binding', title: 'Canonical Authenticated Associated Data (AAD)' },
  { id: 'media-encryption', title: 'End-to-End Encrypted Media' },
  { id: 'server-blind-relay', title: 'Blind Server Relay Operations' },
  { id: 'timing-attacks', title: 'Constant-Time Authentication & Rate Limiting' },
  { id: 'known-limitations', title: 'Known Limitations & Threat Boundaries' },
  { id: 'vulnerability-reporting', title: 'Vulnerability Disclosure & Auditing' }
];

const RELATED = [
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    description: 'Detailed lifecycle specifications for transient in-memory packet ring buffers.'
  },
  {
    title: 'Security Vulnerability Disclosure',
    href: '/legal/security-disclosure',
    description: 'Guidelines for reporting security vulnerabilities to our engineering team.'
  },
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'Overview of minimal data collection and operational metadata handling.'
  }
];

export default function SecurityAndEncryptionPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Security & Encryption Policy"
      subtitle="The exact mathematical, algorithmic, and architectural specifications governing client-side cryptography and zero-knowledge relays in ENCLAVE."
      category="Security"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Philosophy */}
      <section id="security-philosophy" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Security Architecture Philosophy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is engineered under the assumption that <strong className="text-[var(--text-primary)]">the server environment must be treated as untrusted</strong>. Rather than relying on operator promises or database access controls, ENCLAVE enforces confidentiality and integrity through client-side mathematics. All cryptographic keys are generated and held exclusively in the volatile memory of the participating clients&apos; browsers.
        </p>
      </section>

      {/* 2. Primitives */}
      <section id="cryptographic-primitives" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Cryptographic Primitives & Specifications
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE utilizes standard, audited cryptographic primitives provided by the W3C Web Cryptography API and WebAssembly implementations:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Cryptographic Function</th>
                <th className="p-3">Primitive / Algorithm</th>
                <th className="p-3">Parameters / Key Size</th>
                <th className="p-3">Standard Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Symmetric Encryption</td>
                <td className="p-3">AES-GCM (AEAD)</td>
                <td className="p-3">256-bit Key, 96-bit CSPRNG IV, 128-bit Auth Tag</td>
                <td className="p-3">NIST SP 800-38D</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Password-Based Key Derivation</td>
                <td className="p-3">Argon2id (hash-wasm)</td>
                <td className="p-3">m=64 MB, t=3 iterations, p=4 lanes, 256-bit salt</td>
                <td className="p-3">RFC 9106 (IETF)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">PBKDF2 Fallback</td>
                <td className="p-3">PBKDF2-HMAC-SHA256</td>
                <td className="p-3">600,000 iterations, 256-bit salt</td>
                <td className="p-3">NIST SP 800-132</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Ephemeral Session Key Derivation</td>
                <td className="p-3">HKDF-SHA256</td>
                <td className="p-3">256-bit output per unidirectional session key</td>
                <td className="p-3">RFC 5869 (IETF)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Commitment & Integrity Hashing</td>
                <td className="p-3">SHA-256</td>
                <td className="p-3">256-bit digest output</td>
                <td className="p-3">FIPS PUB 180-4</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Random Number Generation</td>
                <td className="p-3">CSPRNG (`crypto.getRandomValues`)</td>
                <td className="p-3">Hardware-backed entropy source</td>
                <td className="p-3">W3C Web Cryptography API</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Key Hierarchy */}
      <section id="key-hierarchy" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Key Hierarchy & Derivation Flow
        </h2>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4 shadow-xs">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            <span>Multi-Tiered Key Lifecycle</span>
          </div>
          <ol className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-decimal leading-relaxed">
            <li><strong>Room Passphrase / Link Secret:</strong> High-entropy Diceware passphrase or CSPRNG token generated client-side.</li>
            <li><strong>Pass-Derived Key (PDK):</strong> Derived from passphrase and room salt using memory-hard Argon2id.</li>
            <li><strong>Key Wrapping Key (KWK):</strong> Derived from PDK to securely wrap the 256-bit Room Master Secret (RMS).</li>
            <li><strong>Room Master Secret (RMS):</strong> Random 256-bit entropy generated client-side by room creator. Stored on server only as an AES-256-GCM encrypted ciphertext bundle.</li>
            <li><strong>Ephemeral Session Keys:</strong> Participants use HKDF-SHA256 with distinct context strings to derive independent unidirectional sender and receiver keys.</li>
          </ol>
        </div>
      </section>

      {/* 4. AAD Binding */}
      <section id="aad-binding" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Canonical Authenticated Associated Data (AAD)
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Every encrypted packet binds immutable routing context into the AES-256-GCM authentication tag via Canonical AAD:
        </p>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg p-4 font-mono text-xs text-[var(--text-primary)] overflow-x-auto">
          <code>ENCLAVE-v1|ROOM:&lt;roomId&gt;|PKT:&lt;packetId&gt;|SENDER:&lt;senderId&gt;|SEQ:&lt;sequence&gt;|TS:&lt;timestamp&gt;</code>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          If a malicious relay or network adversary modifies a packet ID, reorders sequence numbers, modifies timestamps, or replays a packet from another room, the AES-256-GCM tag verification fails immediately, and the client discards the packet.
        </p>
      </section>

      {/* 5. Media Encryption */}
      <section id="media-encryption" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. End-to-End Encrypted Media
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Photo and video attachments are encrypted in client browser memory before transmission:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Client-Side Sanitization:</strong> EXIF metadata, GPS geotags, camera serials, and timestamps are stripped before encryption.</li>
          <li><strong>Dedicated Media Keys:</strong> High-entropy AES-256-GCM keys are derived per attachment.</li>
          <li><strong>Zero-Knowledge Binary Storage:</strong> The server receives only opaque encrypted binary chunks and cannot preview or index media.</li>
        </ul>
      </section>

      {/* 6. Server Blind Relay */}
      <section id="server-blind-relay" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Blind Server Relay Operations
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The ENCLAVE server maintains an in-memory transient ring buffer (maximum 50 packets per active room). Packets exist solely to bridge transient network disconnections among active participants and are zeroized upon room dissolution.
        </p>
      </section>

      {/* 7. Timing Attacks */}
      <section id="timing-attacks" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Constant-Time Authentication & Rate Limiting
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To defend against side-channel timing attacks and brute-force access attempts:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Constant-Time Commitment Verification:</strong> Auth commitment comparisons use cryptographic constant-time equality algorithms to prevent byte-by-byte timing analysis.</li>
          <li><strong>In-Memory Rate Limiting:</strong> Clients are limited to 5 failed verification attempts per 5 minutes per room, triggering a 5-minute lockout upon repeated failures.</li>
        </ul>
      </section>

      {/* 8. Known Limitations */}
      <section id="known-limitations" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          8. Known Limitations & Threat Boundaries
        </h2>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Realistic Security Boundaries</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            No communication system can defend against every conceivable attack vector. We transparently disclose the following architectural boundaries:
          </p>
          <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-1.5 list-disc pl-4">
            <li><strong>Compromised Client Endpoints:</strong> If a participant&apos;s device has malware, keyloggers, or an untrusted browser extension, message content can be captured before encryption or after decryption.</li>
            <li><strong>Physical Screen Capture:</strong> Photography of physical device screens or shoulder surfing cannot be prevented cryptographically.</li>
            <li><strong>Out-of-Band Passphrase Interception:</strong> If a room pass or link is shared over an unencrypted or compromised third-party channel (e.g. SMS), unauthorized recipients can decrypt the room.</li>
          </ul>
        </div>
      </section>

      {/* 9. Vulnerability Reporting */}
      <section id="vulnerability-reporting" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          9. Vulnerability Disclosure & Auditing
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We welcome coordinated security research. Please review our <a href="/legal/security-disclosure" className="text-[var(--accent)] underline">Security Vulnerability Disclosure Policy</a> for reporting procedures and safe harbor rules.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
