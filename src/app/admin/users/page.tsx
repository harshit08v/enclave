'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  Globe,
  Filter
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  provider?: string;
  isVerified: boolean;
  createdAt: number;
  verifiedAt?: number;
  lastLoginAt?: number;
}

interface UserMetrics {
  totalAccounts: number;
  verifiedAccounts: number;
  unverifiedAccounts: number;
  googleAccounts?: number;
  loggedInCount: number;
  currentlyOnline: number;
}

export default function AdminUsersPage() {
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalAccounts: 0,
    verifiedAccounts: 0,
    unverifiedAccounts: 0,
    googleAccounts: 0,
    loggedInCount: 0,
    currentlyOnline: 0
  });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'verified' | 'unverified' | 'loggedin' | 'google'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchUsers = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (searchTerm.trim()) query.set('search', searchTerm.trim());
      if (filterMode !== 'all') query.set('filter', filterMode);

      const res = await fetch(`/api/admin/users?${query.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {
          totalAccounts: 0,
          verifiedAccounts: 0,
          unverifiedAccounts: 0,
          loggedInCount: 0,
          currentlyOnline: 0
        });
        setUsers(data.users || []);
        setLastRefreshed(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterMode]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 6000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never logged in';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            USER DIRECTORY & ACCOUNT TELEMETRY
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Real-time registered accounts, Brevo verification tracking, and login presence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { setLoading(true); fetchUsers(); }}
            className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Total Registered
            </span>
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {metrics.totalAccounts}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            Accounts saved in Upstash Redis
          </div>
        </div>

        {/* Logged In Users */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Logged In Users
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {metrics.loggedInCount}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            {metrics.totalAccounts > 0 ? Math.round((metrics.loggedInCount / metrics.totalAccounts) * 100) : 0}% of registered users
          </div>
        </div>

        {/* Online Now */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Currently Online
            </span>
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>{metrics.currentlyOnline}</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            Active heartbeat sockets across rooms
          </div>
        </div>

        {/* Verified Accounts */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Email Verified
            </span>
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {metrics.verifiedAccounts}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            {metrics.unverifiedAccounts} unverified pending Brevo token
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email, name, or account ID..."
            className="w-full pl-9 pr-3 py-2 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] ml-1.5 mr-0.5" />
          {(
            [
              { id: 'all', label: 'All Accounts' },
              { id: 'google', label: 'Google SSO' },
              { id: 'verified', label: 'Verified' },
              { id: 'unverified', label: 'Unverified' },
              { id: 'loggedin', label: 'Logged In' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                filterMode === tab.id
                  ? 'bg-[var(--accent)] text-white font-medium shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 font-mono text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Account Created</th>
                <th className="py-3 px-4">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      <span>LOADING REGISTERED ACCOUNTS...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div>No accounts match the current filter or search criteria.</div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--surface-muted)]/40 transition-colors">
                    {/* User Identity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-[var(--border)]" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {user.displayName ? user.displayName[0] : 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {user.displayName || 'Anonymous'}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            {user.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span>{user.email}</span>
                        {user.provider === 'google.com' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            Google
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3 px-4">
                      {user.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pending Email Verification</span>
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4 text-[var(--text-secondary)] text-[11px]">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Last Login */}
                    <td className="py-3 px-4 text-[11px]">
                      {user.lastLoginAt ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(user.lastLoginAt)}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">Never logged in</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Cryptographic Guarantee Notice */}
      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/30 font-mono text-[11px] text-[var(--text-muted)] space-y-1">
        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>ZERO-KNOWLEDGE AUTHENTICATION ARCHITECTURE</span>
        </div>
        <p className="leading-relaxed">
          Passwords are protected using memory-hard Argon2id (m=64MB, t=3, p=1). Verification tokens are cryptographically hashed using SHA-256 prior to persistence, ensuring zero plaintext tokens at rest. Plaintext passwords, authentication private keys, and room decryption keys never traverse or persist on the server.
        </p>
      </div>
    </div>
  );
}
