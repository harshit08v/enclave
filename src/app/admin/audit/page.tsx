'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: number;
  adminUser: string;
  action: string;
  target?: string;
  reason?: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  metadata?: Record<string, unknown>;
  ip: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSearch, setActionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      let url = '/api/admin/audit?limit=100';
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (actionSearch.trim()) {
        url += `&action=${encodeURIComponent(actionSearch.trim())}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        let url = '/api/admin/audit?limit=100';
        if (statusFilter !== 'ALL') {
          url += `&status=${statusFilter}`;
        }
        if (actionSearch.trim()) {
          url += `&action=${encodeURIComponent(actionSearch.trim())}`;
        }
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [statusFilter, actionSearch]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            ADMINISTRATIVE AUDIT LOG
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Append-only record of all privileged operator actions, room terminations, and policy alterations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] font-mono text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by action name (e.g. ROOM_TERMINATE, ADMIN_LOGIN)..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'SUCCESS', 'FAILED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded font-mono text-xs transition-colors ${
                statusFilter === st
                  ? 'bg-[var(--accent)] text-white font-medium'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-secondary)]">
            Retrieving audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)]">
            Zero audit events found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Operator</th>
                  <th className="p-3 font-semibold">Target / Reason</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Client IP</th>
                  <th className="p-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-muted)]/50">
                    <td className="p-3 text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-bold text-[var(--text-primary)]">{log.action}</td>
                    <td className="p-3 text-[var(--text-secondary)]">{log.adminUser}</td>
                    <td className="p-3 text-[var(--text-secondary)] max-w-xs truncate">
                      {log.target && <span className="font-semibold text-[var(--text-primary)] mr-1.5">{log.target}:</span>}
                      {log.reason || '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)] text-[11px]">{log.ip}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[10px] text-[var(--text-secondary)]"
                      >
                        Metadata
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Detail Drawer/Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg border border-[var(--border)] bg-[var(--surface)] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-mono text-sm font-bold uppercase">
                  Audit Record: {selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Event ID:</span>
                <span className="text-[var(--text-primary)]">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Timestamp:</span>
                <span className="text-[var(--text-primary)]">
                  {new Date(selectedLog.timestamp).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Operator:</span>
                <span className="text-[var(--text-primary)]">{selectedLog.adminUser}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Origin IP:</span>
                <span className="text-[var(--text-primary)]">{selectedLog.ip}</span>
              </div>
              {selectedLog.target && (
                <div className="flex justify-between py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Target:</span>
                  <span className="text-[var(--text-primary)]">{selectedLog.target}</span>
                </div>
              )}
              {selectedLog.reason && (
                <div className="py-1 border-b border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block mb-1">Reason:</span>
                  <span className="text-[var(--text-primary)]">{selectedLog.reason}</span>
                </div>
              )}
            </div>

            {selectedLog.metadata && (
              <div>
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase block mb-1.5">
                  Sanitized Event Metadata
                </span>
                <pre className="p-3 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
