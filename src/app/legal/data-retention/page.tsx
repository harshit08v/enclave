import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { Clock, Trash2, HardDrive, Server, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Data Retention & Deletion Policy | ENCLAVE',
  description: 'Exhaustive data lifecycle, automated memory reaper schedules, and deletion triggers for the ENCLAVE platform.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/data-retention',
  },
};

const TOC = [
  { id: 'retention-principles', title: 'Data Lifecycle Principles' },
  { id: 'retention-matrix', title: 'Comprehensive Data Retention Matrix' },
  { id: 'ephemeral-reaper', title: 'Automated In-Memory Reaper Specifications' },
  { id: 'room-dissolution', title: 'Room Dissolution & Cryptographic Erasure' },
  { id: 'account-lifecycle', title: 'Account Data & Client Zeroization' },
  { id: 'backups-persistence', title: 'Server Backups & Persistent Logs' },
  { id: 'deletion-verification', title: 'Verifying Deletion on Client Devices' }
];

const RELATED = [
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'Comprehensive overview of personal data minimization and privacy protections.'
  },
  {
    title: 'Account Deletion & Data Rights',
    href: '/legal/data-rights',
    description: 'Step-by-step instructions for executing self-service account deletion.'
  },
  {
    title: 'Cookie & Storage Policy',
    href: '/legal/cookies',
    description: 'Detailed inventory of browser storage keys and deletion methods.'
  }
];

export default function DataRetentionPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Data Retention & Deletion Policy"
      subtitle="The complete technical lifecycle matrix documenting exact retention durations, automated memory purging, and data zeroization triggers."
      category="Privacy"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Principles */}
      <section id="retention-principles" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Data Lifecycle Principles
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Traditional platforms treat user communication as permanent corporate assets stored indefinitely in relational databases. ENCLAVE follows a strict <strong className="text-[var(--text-primary)]">ephemeral-first paradigm</strong>: communication state exists only as long as the conversation is actively occurring. When a room closes, its data is permanently dissolved from volatile RAM.
        </p>
      </section>

      {/* 2. Retention Matrix */}
      <section id="retention-matrix" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Comprehensive Data Retention Matrix
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Below is the verified lifecycle schedule for all data processed across the ENCLAVE system:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Data Category</th>
                <th className="p-3">Storage Layer</th>
                <th className="p-3">Maximum Retention Window</th>
                <th className="p-3">Erasure Trigger</th>
                <th className="p-3">Method of Deletion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Encrypted Message Packets</td>
                <td className="p-3">Volatile RAM (Ring Buffer)</td>
                <td className="p-3">Duration of active room session (max 50 packets)</td>
                <td className="p-3">All participants leave OR room idle timeout</td>
                <td className="p-3">Array zeroization and memory dereferencing</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Encrypted Media Buffers</td>
                <td className="p-3">Volatile RAM (`encryptedMedia` Map)</td>
                <td className="p-3">Duration of active room session</td>
                <td className="p-3">Room exit OR reaper trigger</td>
                <td className="p-3">Map eviction and garbage collection</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Room Cryptographic Metadata</td>
                <td className="p-3">Volatile RAM (`roomStore`)</td>
                <td className="p-3">Duration of room session</td>
                <td className="p-3">Room dissolution</td>
                <td className="p-3">State set to DESTROYED; purged within 30 seconds</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Rate Limit Records</td>
                <td className="p-3">Volatile RAM (`rateLimitStore`)</td>
                <td className="p-3">5 minutes from last attempt</td>
                <td className="p-3">5-minute inactivity window expiry</td>
                <td className="p-3">Automatic Map deletion</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">Account Profile & Sessions</td>
                <td className="p-3">Client Browser (`localStorage`)</td>
                <td className="p-3">Until user executes self-service deletion</td>
                <td className="p-3">Manual deletion via Profile console</td>
                <td className="p-3">Client-side `localStorage.removeItem()`</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Inactive Reaper */}
      <section id="ephemeral-reaper" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Automated In-Memory Reaper Specifications
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The ENCLAVE server executes a background reaper routine every 10 seconds to detect and dissolve abandoned or inactive rooms:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-[var(--text-secondary)]">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Waiting Room Idle Limit</span>
            <div className="text-lg font-bold text-[var(--accent)] font-mono">3 Minutes</div>
            <p className="text-[11px] leading-snug">Rooms in WAITING state with no participant join activity are automatically destroyed after 180 seconds.</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Active Room Inactivity</span>
            <div className="text-lg font-bold text-[var(--accent)] font-mono">15 Minutes</div>
            <p className="text-[11px] leading-snug">Active rooms experiencing 15 minutes of zero message or heartbeat activity are permanently reaped.</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-1.5 shadow-xs">
            <span className="font-semibold text-[var(--text-primary)]">Abandoned Room Timeout</span>
            <div className="text-lg font-bold text-[var(--accent)] font-mono">10 Minutes</div>
            <p className="text-[11px] leading-snug">Rooms created but never joined by any client are purged after 600 seconds.</p>
          </div>
        </div>
      </section>

      {/* 4. Room Dissolution */}
      <section id="room-dissolution" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Room Dissolution & Cryptographic Erasure
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          When a room transitions to <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">DESTROYED</code> state:
        </p>
        <ol className="text-xs font-mono space-y-2 text-[var(--text-secondary)] pl-4 list-decimal leading-relaxed">
          <li>Active WebSocket / polling connections are immediately disconnected.</li>
          <li>All stored ciphertext packets and encrypted media buffers are wiped from memory.</li>
          <li>The room identifier is blacklisted from receiving subsequent connections.</li>
          <li>Client browsers execute memory cleanup, zeroizing session keys and clearing message displays.</li>
        </ol>
      </section>

      {/* 5. Account Lifecycle */}
      <section id="account-lifecycle" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. Account Data & Client Zeroization
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Registered accounts and profile identities exist in client-side storage until deleted. When you click <strong className="text-[var(--text-primary)]">&quot;Delete Account Permanently&quot;</strong> in your Profile:
        </p>
        <ul className="text-xs font-mono space-y-1.5 text-[var(--text-secondary)] pl-4 list-disc">
          <li>All local authentication tokens are cleared from browser <code className="text-xs">localStorage</code>.</li>
          <li>Active device session registers and pending verification tokens are wiped.</li>
          <li>The client is logged out and redirected to the homepage.</li>
        </ul>
      </section>

      {/* 6. Backups & Persistence */}
      <section id="backups-persistence" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Server Backups & Persistent Logs
        </h2>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-2 text-xs font-mono text-[var(--text-secondary)]">
          <p>
            Because chat messages and room states are never committed to permanent databases or disk drives, <strong className="text-[var(--text-primary)]">no server backup archives contain your messages or media attachments</strong>. When memory is cleared, the data is gone permanently.
          </p>
        </div>
      </section>

      {/* 7. Verification */}
      <section id="deletion-verification" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          7. Verifying Deletion on Client Devices
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          To ensure complete local cleanup after leaving a conversation, simply close your browser tab or clear browser session data. Once the tab is closed, all client-side decryption keys held in JavaScript memory are automatically destroyed by the browser engine.
        </p>
      </section>
    </LegalDocumentLayout>
  );
}
