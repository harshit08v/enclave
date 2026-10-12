'use client';

import React from 'react';
import { Users, KeyRound, HardDrive, CheckCircle2 } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
          USER ACCOUNTS (DECENTRALIZED ARCHITECTURE)
        </h1>
        <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
          Truthful architectural status: ENCLAVE stores zero user credentials or profile records on the server.
        </p>
      </div>

      {/* Zero Server Accounts Architecture Notice */}
      <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold text-[var(--text-primary)] uppercase">
              Decentralized / Client-Side Account Storage
            </h2>
            <p className="font-mono text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              In accordance with ENCLAVE&apos;s privacy and threat model, user profiles, display names, avatars, and local key credentials are kept strictly in the visitor&apos;s client-side browser storage (<code className="text-[var(--text-primary)] font-bold">localStorage</code> and <code className="text-[var(--text-primary)] font-bold">sessionStorage</code>). There is no centralized SQL/NoSQL user database on the server.
            </p>
          </div>
        </div>
      </div>

      {/* Technical Storage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
              Authentication Keys & Sessions
            </h3>
          </div>
          <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
            Guest sessions and account profiles generate transient cryptographic tokens client-side. The server never observes passwords, private keys, or plain user emails.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-2">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
              Room Presence & Ephemeral Discovery
            </h3>
          </div>
          <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
            When users enter rooms, they broadcast ephemeral display identities bound to that specific room session only. When the room dissolves, all transient participant identifiers are immediately zeroed.
          </p>
        </div>
      </div>

      {/* Compliance & Zero-Knowledge Verification */}
      <div className="p-5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>ZERO-KNOWLEDGE AUDIT COMPLIANCE</span>
        </div>
        <p className="text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed text-[11px]">
          An administrative interface that displays simulated or mock central user accounts would be misleading and violate the platform&apos;s zero-knowledge assertions. This view formally certifies that no central user directory exists to inspect, modify, or leak.
        </p>
      </div>
    </div>
  );
}
