import React from 'react';
import type { Metadata } from 'next';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Shield, Lock, EyeOff, Server, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Zero Retention & Encryption | ENCLAVE',
  description: 'Exhaustive privacy policy for ENCLAVE, detailing zero-knowledge encryption, ephemeral in-memory packet handling, and data minimization.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/privacy',
  },
  keywords: ['ENCLAVE privacy policy', 'zero-knowledge privacy', 'ephemeral data retention', 'GDPR compliance', 'CCPA privacy'],
};

const TOC = [
  { id: 'principles', title: 'Core Privacy Principles' },
  { id: 'data-collected', title: 'Categories of Data Processed' },
  { id: 'plaintext-vs-metadata', title: 'Content vs. Cryptographic Metadata' },
  { id: 'ip-and-logs', title: 'IP Addresses & Technical Logs' },
  { id: 'media-handling', title: 'Encrypted Media & File Routing' },
  { id: 'legal-bases', title: 'Legal Bases for Processing' },
  { id: 'subprocessors', title: 'Subprocessors & Infrastructure' },
  { id: 'retention-deletion', title: 'Data Retention & Ephemeral Erasure' },
  { id: 'user-rights', title: 'Your Data Protection Rights' },
  { id: 'children', title: 'Children’s Privacy' },
  { id: 'international-transfers', title: 'International Data Handling' },
  { id: 'contact-grievance', title: 'Contact & Grievance Redressal' }
];

const RELATED = [
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    description: 'Detailed lifecycle breakdown of in-memory chat buffers and automated reaper triggers.'
  },
  {
    title: 'Security & Encryption Policy',
    href: '/legal/security',
    description: 'Technical specifications of AES-256-GCM, Argon2id, and client-side key wrapping.'
  },
  {
    title: 'Cookie & Storage Policy',
    href: '/legal/cookies',
    description: 'Complete audit of browser localStorage tokens, active sessions, and theme preferences.'
  },
  {
    title: 'Account Deletion & Data Rights',
    href: '/legal/data-rights',
    description: 'Procedures for self-service account deletion and data principal rights.'
  }
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      subtitle="How ENCLAVE processes, minimizes, and protects your information across ephemeral communication rooms and account services."
      category="Privacy"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Principles */}
      <section id="principles" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Core Privacy Principles
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is engineered around the principle of <strong className="text-[var(--text-primary)]">Privacy by Design</strong>. Traditional communication platforms collect, index, monetize, and permanently store user messages and metadata. ENCLAVE inverts this architecture: our server operates strictly as a blind, ephemeral courier. We collect the minimum technical information necessary to establish encrypted rooms and route ciphertext between active participants.
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Mathematical Invariants</span>
          </div>
          <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-2">
            <li>• Zero server plaintext: Server never receives or stores unencrypted message content or media.</li>
            <li>• Zero long-term chat storage: Rooms exist only in volatile server RAM and dissolve upon exit or timeout.</li>
            <li>• Zero third-party trackers: No analytics beacons, advertising pixels, or behavioral tracking SDKs.</li>
          </ul>
        </div>
      </section>

      {/* 2. Data Collected */}
      <section id="data-collected" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Categories of Data Processed
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We process only the specific data elements required to authenticate users, manage room lifecycles, and relay encrypted packets:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Data Category</th>
                <th className="p-3">Specific Elements</th>
                <th className="p-3">Storage Location</th>
                <th className="p-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">Account Identity</td>
                <td className="p-3">Display Name, Email address, Account ID</td>
                <td className="p-3">Client localStorage / Account Store</td>
                <td className="p-3">User identification and workspace session authentication.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">Cryptographic Metadata</td>
                <td className="p-3">Room ID, Salt (Base64), Auth Commitment (SHA-256), Wrapped Secret Bundle</td>
                <td className="p-3">Volatile Server RAM (`roomStore`)</td>
                <td className="p-3">Enabling authorized participants to verify room access and unwrap room keys.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">In-Transit Ciphertext</td>
                <td className="p-3">AES-256-GCM ciphertext, 96-bit CSPRNG IV, sequence counter, timestamp</td>
                <td className="p-3">Transient RAM ring buffer (max 50 packets)</td>
                <td className="p-3">Relaying encrypted messages between active participants in real-time.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">Presence State</td>
                <td className="p-3">Active participant count, heartbeat timestamp, room state (WAITING/ACTIVE/ENDING/DESTROYED)</td>
                <td className="p-3">Volatile Server RAM</td>
                <td className="p-3">Synchronizing real-time membership and triggering automated dissolution.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Content vs Metadata */}
      <section id="plaintext-vs-metadata" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Content vs. Cryptographic Metadata
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          We maintain a strict architectural distinction between message content and routing metadata:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--accent)]" />
              <span>Message & Media Content</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Message text, images, and video attachments are encrypted in client browser memory using AES-256-GCM with keys derived via Argon2id. The server has no mathematical access to decryption keys and cannot view, search, index, or decrypt content.
            </p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--accent)]" />
              <span>Operational Metadata</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The server processes ephemeral metadata (packet ID, room ID, sequence number, timestamp) strictly to route bytes and prevent packet replay. This metadata is never tied to advertising profiles and is purged upon room destruction.
            </p>
          </div>
        </div>
      </section>

      {/* 4. IP & Logs */}
      <section id="ip-and-logs" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. IP Addresses & Technical Logs
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To prevent denial-of-service (DoS) attacks and brute-force access attempts against protected rooms, ENCLAVE maintains a temporary in-memory rate-limiting table (<code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">rateLimitStore</code>).
        </p>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            • Rate-limit keys (combining client IP and Room ID) are stored purely in volatile RAM and automatically reset after 5 minutes of inactivity.<br />
            • ENCLAVE does not maintain permanent IP access logs or link network addresses with account profiles.<br />
            • Web server network infrastructure logs (such as transient edge reverse proxy logs) are retained strictly for operational security and discarded on rotating schedules.
          </p>
        </div>
      </section>

      {/* 5. Media Handling */}
      <section id="media-handling" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Encrypted Media & File Routing
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Photos and videos sent within an ENCLAVE room undergo client-side metadata stripping (removing EXIF, GPS coordinates, and camera serial numbers) and are encrypted with unique AES-256-GCM media keys before upload to the ephemeral media endpoint (<code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">/api/rooms/[roomId]/media</code>).
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Encrypted media payloads reside exclusively in the room’s in-memory record. They are never written to permanent disk storage or cloud object buckets and are permanently purged when the room dissolves.
        </p>
      </section>

      {/* 6. Legal Bases */}
      <section id="legal-bases" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Legal Bases for Processing
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Under applicable data protection frameworks, including the <strong className="text-[var(--text-primary)]">Digital Personal Data Protection Act, 2023 (India)</strong> and equivalent international principles, ENCLAVE processes data under the following legitimate grounds:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Performance of Service Contract:</strong> Processing cryptographic handshakes and routing ciphertext requested by users.</li>
          <li><strong>Consent:</strong> Explicit user consent when creating registered accounts, customizing profile names, or updating email addresses.</li>
          <li><strong>Legitimate Technical Security:</strong> Operating in-memory rate limiting to protect platform availability and prevent automated abuse.</li>
        </ul>
      </section>

      {/* 7. Subprocessors */}
      <section id="subprocessors" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Subprocessors & Infrastructure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE minimizes third-party dependencies. We do not integrate with advertising networks, behavioral tracking tools, or external customer analytics platforms.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Entity / Provider</th>
                <th className="p-3">Role / Service</th>
                <th className="p-3">Data Handled</th>
                <th className="p-3">Access Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">Hosting & Edge Network Provider</td>
                <td className="p-3">Application compute & HTTP routing</td>
                <td className="p-3">Encrypted in-transit HTTP/WebSocket packets</td>
                <td className="p-3">Blind transit (TLS encrypted)</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-[var(--text-primary)]">Email Verification Gateway (Optional)</td>
                <td className="p-3">Transactional verification token delivery</td>
                <td className="p-3">Destination email address & verification token</td>
                <td className="p-3">Transient delivery only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 8. Retention & Deletion */}
      <section id="retention-deletion" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          8. Data Retention & Ephemeral Erasure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE implements automated cryptographic erasure and in-memory garbage collection:
        </p>
        <ul className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-disc">
          <li><strong>Room Dissolution:</strong> When the last participant exits a room, all packet buffers, active socket references, and media records are immediately zeroized in memory.</li>
          <li><strong>Automated Reaper:</strong> Rooms idle for more than 15 minutes or abandoned waiting rooms (idle &gt; 3 minutes) are automatically purged by the server reaper process.</li>
          <li><strong>Client Account Deletion:</strong> Users can execute self-service account deletion via the Profile console, immediately zeroizing all local authentication tokens and active session records.</li>
        </ul>
      </section>

      {/* 9. User Rights */}
      <section id="user-rights" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          9. Your Data Protection Rights
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          In accordance with the DPDP Act 2023 and global privacy frameworks, you have specific statutory rights regarding your personal data:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-[var(--text-secondary)]">
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Right of Access & Summary</span>
            <p>Request a summary of personal data processed and identities of data fiduciaries.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Right of Correction & Erasure</span>
            <p>Update inaccurate display names, modify email records, or request complete account erasure.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Right of Grievance Redressal</span>
            <p>Submit formal complaints regarding data processing practices directly to our compliance desk.</p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">Right to Nominate</span>
            <p>Designate an individual to exercise privacy rights in the event of incapacity or death.</p>
          </div>
        </div>
      </section>

      {/* 10. Children */}
      <section id="children" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          10. Children’s Privacy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE is intended for individuals who are at least 18 years of age (or the age of majority in your jurisdiction). We do not knowingly collect personal data from children or track behavioral profiles of minors. If you believe a minor has provided personal data, please contact our privacy desk for immediate deletion.
        </p>
      </section>

      {/* 11. International Transfers */}
      <section id="international-transfers" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          11. International Data Handling
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Because ENCLAVE routes encrypted ciphertext via global edge nodes, ephemeral data packets may transit international network routes. All transmissions are protected by transport-layer encryption (TLS 1.3) and client-side end-to-end encryption (AES-256-GCM). We ensure compliance with statutory data transfer restrictions.
        </p>
      </section>

      {/* 12. Contact */}
      <section id="contact-grievance" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          12. Contact & Grievance Redressal
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To exercise your privacy rights, submit a data inquiry, or contact our designated Grievance Officer under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules and DPDP Act:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono space-y-2">
          <div><strong className="text-[var(--text-primary)]">Compliance & Privacy Desk:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Grievance Redressal Channel:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
          <div><strong className="text-[var(--text-primary)]">Response Timeline Target:</strong> Acknowledged within 48 hours; resolved within 30 days.</div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
