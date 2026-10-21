'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Ban,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';

interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number;
  blockedBy: string;
}

interface Incident {
  id: string;
  timestamp: number;
  type: string;
  ip: string;
  detail: string;
  severity: string;
}

interface Lockout {
  key: string;
  attempts: number;
  lastAttempt: number;
  remainingSeconds: number;
}

export default function AdminSecurityPage() {
  const { csrfToken } = useAdminAuth();
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [, setLoading] = useState(true);

  // New block modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newDurationHours, setNewDurationHours] = useState('1');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSecurity = async () => {
    try {
      const res = await fetch('/api/admin/security', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBlockedIps(data.blockedIps || []);
        setIncidents(data.incidents || []);
        setLockouts(data.activeLockouts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/admin/security', { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          setBlockedIps(data.blockedIps || []);
          setIncidents(data.incidents || []);
          setLockouts(data.activeLockouts || []);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleBlockIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim() || !newReason.trim()) {
      setModalError('Both IP and a reason are required.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const hours = parseFloat(newDurationHours) || 1;
    const durationMs = hours === 0 ? 0 : Math.round(hours * 3600 * 1000);

    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-enclave-admin-csrf': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'block',
          ip: newIp.trim(),
          reason: newReason.trim(),
          durationMs
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowBlockModal(false);
        setNewIp('');
        setNewReason('');
        fetchSecurity();
      } else {
        setModalError(data.error || 'Failed to add IP block.');
      }
    } catch {
      setModalError('Network error while applying IP block.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Are you sure you want to remove the block on ${ip}?`)) return;

    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-enclave-admin-csrf': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'unblock',
          ip
        })
      });

      if (res.ok) {
        fetchSecurity();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            SECURITY & ABUSE MITIGATION
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Real-time attack mitigation, IP access controls, and rate limit defense.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Restrict IP</span>
          </button>
          <button
            onClick={fetchSecurity}
            className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Blocked IPs Section */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2 className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
              Restricted IP Addresses ({blockedIps.length})
            </h2>
          </div>
        </div>

        {blockedIps.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[var(--text-muted)]">
            No active IP restrictions. All valid client origins permitted.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3 font-semibold">IP Address</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Blocked By</th>
                  <th className="p-3 font-semibold">Expires</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {blockedIps.map((b) => (
                  <tr key={b.ip} className="hover:bg-[var(--surface-muted)]/50">
                    <td className="p-3 font-bold text-[var(--text-primary)]">{b.ip}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{b.reason}</td>
                    <td className="p-3 text-[var(--text-muted)]">{b.blockedBy}</td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      {b.expiresAt === 0 ? 'Permanent' : new Date(b.expiresAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleUnblock(b.ip)}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-rose-600 transition-colors"
                        title="Remove restriction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Rate Limit Lockouts */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
            Active Rate Limit Lockouts ({lockouts.length})
          </h2>
        </div>

        {lockouts.length === 0 ? (
          <div className="text-center py-4 font-mono text-xs text-[var(--text-muted)]">
            Zero clients currently locked out by automated rate limiting.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lockouts.map((l) => (
              <div key={l.key} className="p-3 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs">
                <div className="font-semibold text-[var(--text-primary)] truncate">{l.key}</div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1.5">
                  <span>Failed attempts: {l.attempts}</span>
                  <span className="text-rose-600 font-bold">{l.remainingSeconds}s remaining</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incident Log Stream */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
          <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
            Security Incident Stream
          </h2>
        </div>

        {incidents.length === 0 ? (
          <div className="text-center py-6 font-mono text-xs text-[var(--text-muted)]">
            Zero security incidents recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-3 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)]">{inc.type}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">IP: {inc.ip}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1">{inc.detail}</div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                    inc.severity === 'HIGH' || inc.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {inc.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add IP Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Ban className="w-5 h-5" />
                <h3 className="font-mono text-sm font-bold uppercase">
                  Add IP Restriction
                </h3>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-mono text-rose-700 dark:text-rose-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleBlockIp} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-[var(--text-primary)] mb-1 font-semibold">
                  IP Address (IPv4 or IPv6)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 198.51.100.24"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-[var(--text-primary)] mb-1 font-semibold">
                  Reason for Restriction
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Repeated packet forgery attempt"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-[var(--text-primary)] mb-1 font-semibold">
                  Block Duration
                </label>
                <select
                  value={newDurationHours}
                  onChange={(e) => setNewDurationHours(e.target.value)}
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                  <option value="0">Indefinite / Permanent</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3 py-2 rounded border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-mono font-medium disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Applying...' : 'Enforce Restriction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
