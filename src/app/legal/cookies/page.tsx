import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { HardDrive, CheckCircle2, ShieldCheck, EyeOff, Trash2 } from 'lucide-react';

export const metadata = {
  title: 'Cookie & Storage Policy | Zero Tracking | ENCLAVE',
  description: 'Full transparency regarding ENCLAVE\'s use of browser local storage and essential session tokens with zero third-party tracking cookies.',
  alternates: {
    canonical: 'https://enclave.vercel.app/legal/cookies',
  },
};

const TOC = [
  { id: 'storage-philosophy', title: 'Our Storage Philosophy' },
  { id: 'cookies-vs-localstorage', title: 'Cookies vs. Local Storage' },
  { id: 'storage-audit', title: 'Complete Audit of Browser Storage' },
  { id: 'third-party-tracking', title: 'Third-Party Trackers & Beacons' },
  { id: 'managing-storage', title: 'How to Manage & Clear Storage' },
  { id: 'contact', title: 'Questions & Inquiries' }
];

const RELATED = [
  {
    title: 'Privacy Policy',
    href: '/legal/privacy',
    description: 'Comprehensive overview of data processing, operational metadata, and user privacy rights.'
  },
  {
    title: 'Data Retention & Deletion Policy',
    href: '/legal/data-retention',
    description: 'Lifecycle specifications for in-memory room packets, media buffers, and local storage.'
  },
  {
    title: 'Account Deletion & Data Rights',
    href: '/legal/data-rights',
    description: 'Self-service account deletion workflow and complete local storage zeroization.'
  }
];

export default function CookiePolicyPage() {
  return (
    <LegalDocumentLayout
      title="Cookie & Storage Policy"
      subtitle="Exhaustive accounting of all browser storage mechanisms, authentication tokens, and preference keys utilized by ENCLAVE."
      category="Privacy"
      effectiveDate="October 9, 2026"
      lastUpdated="October 9, 2026"
      toc={TOC}
      relatedPolicies={RELATED}
    >
      {/* 1. Philosophy */}
      <section id="storage-philosophy" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          1. Our Storage Philosophy
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          ENCLAVE strictly rejects behavioral advertising, third-party analytics scripts, and persistent tracking beacons. We utilize browser storage solely for <strong className="text-[var(--text-primary)]">strictly necessary functions</strong>—specifically maintaining your authenticated session and remembering your interface theme.
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3 shadow-xs">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Storage Invariants</span>
          </div>
          <ul className="text-xs font-mono text-[var(--text-secondary)] space-y-1.5">
            <li>• No third-party tracking cookies or advertising networks.</li>
            <li>• No cross-site fingerprinting or persistent device graphs.</li>
            <li>• All stored client keys are accessible only on your local browser origin.</li>
          </ul>
        </div>
      </section>

      {/* 2. Cookies vs Local Storage */}
      <section id="cookies-vs-localstorage" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          2. Cookies vs. Local Storage
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Modern web applications can store state using HTTP cookies or browser Web Storage APIs (such as <code className="text-xs bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">localStorage</code>). ENCLAVE relies primarily on client-side Web Storage to ensure that sensitive tokens are never automatically attached to outbound HTTP requests across foreign domains.
        </p>
      </section>

      {/* 3. Complete Storage Audit */}
      <section id="storage-audit" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          3. Complete Audit of Browser Storage
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Below is a complete, verified list of all storage keys created by the ENCLAVE client application:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse border border-[var(--border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-primary)]">
                <th className="p-3">Storage Key</th>
                <th className="p-3">Type</th>
                <th className="p-3">Data Contained</th>
                <th className="p-3">Retention Duration</th>
                <th className="p-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">enclave_auth_user</td>
                <td className="p-3">localStorage</td>
                <td className="p-3">JSON object (id, email, displayName, role)</td>
                <td className="p-3">Persistent until manual sign-out or deletion</td>
                <td className="p-3">Maintains client authentication state and workspace identity.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">enclave_active_sessions</td>
                <td className="p-3">localStorage</td>
                <td className="p-3">Array of active session descriptors (device type, timestamp)</td>
                <td className="p-3">Persistent until revoked</td>
                <td className="p-3">Empowers user to view and revoke active device sessions in Security Center.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">enclave_theme</td>
                <td className="p-3">localStorage</td>
                <td className="p-3">String value: &quot;light&quot; | &quot;dark&quot; | &quot;system&quot;</td>
                <td className="p-3">Persistent</td>
                <td className="p-3">Remembers your visual interface appearance preference.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">enclave_pwd_record</td>
                <td className="p-3">localStorage</td>
                <td className="p-3">Client password record string</td>
                <td className="p-3">Persistent until account deletion</td>
                <td className="p-3">Validates password updates in local client session manager.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-[var(--text-primary)]">enclave_pending_email_change</td>
                <td className="p-3">localStorage</td>
                <td className="p-3">Temporary verification token and new email address</td>
                <td className="p-3">Expires in 15 minutes or upon verification</td>
                <td className="p-3">Facilitates secure email change verification workflow.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Third-Party Trackers */}
      <section id="third-party-tracking" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          4. Third-Party Trackers & Beacons
        </h2>
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-5 space-y-2">
          <p className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
            ENCLAVE loads <strong>zero third-party tracking scripts</strong>, including Google Analytics, Meta Pixels, Hotjar, or advertising tracking beacons. No tracking consent banners are required because no non-essential profiling cookies or trackers are deployed.
          </p>
        </div>
      </section>

      {/* 5. Managing Storage */}
      <section id="managing-storage" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          5. How to Manage & Clear Storage
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          You can inspect, manage, or delete all ENCLAVE storage at any time using:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-[var(--text-secondary)]">
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>In-App Self-Service Deletion</span>
            </span>
            <p>
              Navigate to <a href="/app/profile" className="text-[var(--accent)] underline">Profile & Settings</a> and click <em>&quot;Delete Account Permanently&quot;</em> to instantly wipe all local tokens and session keys.
            </p>
          </div>
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Browser Developer Tools</span>
            </span>
            <p>
              Press <kbd className="bg-[var(--surface-muted)] px-1 rounded border border-[var(--border)]">F12</kbd> → <em>Application / Storage</em> tab → <em>Local Storage</em> → Click &quot;Clear All&quot;.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Contact */}
      <section id="contact" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-[var(--text-primary)]">
          6. Questions & Inquiries
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          If you have questions regarding our browser storage implementation, reach out to our privacy engineering desk:
        </p>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-xs font-mono">
          <div><strong className="text-[var(--text-primary)]">Privacy Desk:</strong> <a href="mailto:enclave.support.legal@gmail.com" className="text-[var(--accent)] hover:underline">enclave.support.legal@gmail.com</a></div>
        </div>
      </section>
    </LegalDocumentLayout>
  );
}
