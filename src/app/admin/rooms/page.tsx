'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  X,
  Users
} from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';

interface RoomItem {
  id: string;
  maskedId: string;
  state: string;
  participantCount: number;
  accessMode: string;
  oneTimeAccess: boolean;
  createdAt: number;
  lastActivity: number;
  encryptedPacketsCount: number;
  encryptedMediaCount: number;
}

export default function AdminRoomsPage() {
  const { csrfToken } = useAdminAuth();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  
  // Termination modal state
  const [terminatingRoom, setTerminatingRoom] = useState<RoomItem | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      const url = stateFilter === 'ALL' ? '/api/admin/rooms' : `/api/admin/rooms?state=${stateFilter}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
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
        const url = stateFilter === 'ALL' ? '/api/admin/rooms' : `/api/admin/rooms?state=${stateFilter}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          setRooms(data.rooms || []);
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
  }, [stateFilter]);

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingRoom) return;
    if (!terminationReason.trim() || terminationReason.trim().length < 5) {
      setActionError('A specific operational reason (minimum 5 characters) is required.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-enclave-admin-csrf': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'terminate',
          roomId: terminatingRoom.id,
          reason: terminationReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Room ${data.maskedId} authoritatively terminated and wiped from memory.`);
        setTerminatingRoom(null);
        setTerminationReason('');
        fetchRooms();
      } else {
        setActionError(data.error || 'Failed to terminate room.');
      }
    } catch {
      setActionError('Network error while requesting room dissolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return r.maskedId.toLowerCase().includes(term) || r.id.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            ACTIVE ROOM OPERATIONS
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Zero-knowledge room telemetry. Plaintext messages and keys are never retrievable.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRooms}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] font-mono text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Memory</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by masked room ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          {['ALL', 'CREATED', 'WAITING', 'ACTIVE', 'DESTROYED'].map((st) => (
            <button
              key={st}
              onClick={() => setStateFilter(st)}
              className={`px-3 py-2 rounded font-mono text-xs transition-colors ${
                stateFilter === st
                  ? 'bg-[var(--accent)] text-white font-medium'
                  : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Table */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-secondary)]">
            Loading active room instances from memory store...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-[var(--text-muted)]">
            No active rooms match the specified filter or criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3.5 font-semibold">Masked ID</th>
                  <th className="p-3.5 font-semibold">State</th>
                  <th className="p-3.5 font-semibold">Participants</th>
                  <th className="p-3.5 font-semibold">Access Mode</th>
                  <th className="p-3.5 font-semibold">Packets / Media</th>
                  <th className="p-3.5 font-semibold">Created</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredRooms.map((room) => {
                  const isAlive = room.state !== 'DESTROYED' && room.state !== 'DESTROYING';
                  return (
                    <tr key={room.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                      <td className="p-3.5 font-bold text-[var(--text-primary)]">
                        {room.maskedId}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            room.state === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : room.state === 'WAITING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {room.state}
                        </span>
                      </td>
                      <td className="p-3.5 text-[var(--text-primary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          {room.participantCount}
                        </span>
                      </td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {room.accessMode}
                        {room.oneTimeAccess && <span className="ml-1 text-[9px] text-amber-600">(1-time)</span>}
                      </td>
                      <td className="p-3.5 text-[var(--text-secondary)]">
                        {room.encryptedPacketsCount} packets / {room.encryptedMediaCount} media
                      </td>
                      <td className="p-3.5 text-[var(--text-muted)] text-[11px]">
                        {new Date(room.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3.5 text-right">
                        {isAlive ? (
                          <button
                            onClick={() => {
                              setTerminatingRoom(room);
                              setTerminationReason('');
                              setActionError(null);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-medium transition-colors"
                          >
                            Terminate Room
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">Dissolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Authoritative Dissolution Modal */}
      {terminatingRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-mono text-sm font-bold uppercase">
                  Dissolve Room {terminatingRoom.maskedId}
                </h3>
              </div>
              <button
                onClick={() => setTerminatingRoom(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-mono text-xs text-[var(--text-secondary)] leading-relaxed">
              Authoritatively destroys room memory immediately. All connected client sockets will be disconnected and in-memory cryptographic packets will be zeroed.
            </p>

            {actionError && (
              <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-mono text-rose-700 dark:text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleTerminateSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-[var(--text-primary)] mb-1 font-semibold">
                  Operational Reason (Required for Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="e.g., Abandoned room cleanup, reported malicious relay, or operator lifecycle flush..."
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTerminatingRoom(null)}
                  className="px-3 py-2 rounded border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-medium disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Dissolving...' : 'Confirm Dissolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
