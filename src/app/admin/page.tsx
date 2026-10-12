'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Server,
  ShieldCheck,
  AlertOctagon,
  Cpu,
  Layers,
  ArrowUpRight,
  RefreshCw,
  HardDrive
} from 'lucide-react';

interface OverviewData {
  operational: {
    activeRooms: number;
    waitingRooms: number;
    totalConnectedSockets: number;
    activeMediaCount: number;
    transientPacketCount: number;
    rateLimitsTracked: number;
    activeRateLimitLockouts: number;
    blockedIpsCount: number;
  };
  system: {
    uptimeSeconds: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  settings: {
    maintenanceMode: boolean;
    maxRoomLifetimeMs: number;
    waitingInactivityLimitMs: number;
  };
  recentIncidents: Array<{
    id: string;
    timestamp: number;
    type: string;
    ip: string;
    detail: string;
    severity: string;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
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
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        if (res.ok && mounted) {
          const json = await res.json();
          setData(json);
          setLastRefreshed(new Date());
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

  const formatUptime = (totalSeconds: number) => {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-secondary)]">
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
          POLLING TELEMETRY...
        </div>
      </div>
    );
  }

  const op = data?.operational;
  const sys = data?.system;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Top Title & Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            SYSTEM OVERVIEW & TELEMETRY
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Real operational state observed directly from server memory. Zero fake metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            Last sample: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchOverview}
            className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Maintenance Mode Banner if active */}
      {data?.settings.maintenanceMode && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-700 dark:text-amber-400">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <div className="font-mono text-xs">
            <strong>MAINTENANCE MODE IS CURRENTLY ACTIVE:</strong> Room creation is restricted to administrative personnel.
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Rooms */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Active Rooms
            </span>
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {op?.activeRooms ?? 0}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1 flex items-center justify-between">
            <span>Waiting state: {op?.waitingRooms ?? 0}</span>
            <Link href="/admin/rooms" className="hover:text-[var(--accent)] inline-flex items-center">
              Inspect <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Connected Sockets */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Connected Clients
            </span>
            <Layers className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {op?.totalConnectedSockets ?? 0}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            Active heartbeat sockets
          </div>
        </div>

        {/* Transient Media & Wire Packets */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              In-Memory Payloads
            </span>
            <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {op?.activeMediaCount ?? 0} <span className="text-sm font-normal text-[var(--text-muted)]">media</span>
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1">
            {op?.transientPacketCount ?? 0} buffered wire packets
          </div>
        </div>

        {/* Rate Limiting & Protection */}
        <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              Active Lockouts
            </span>
            <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {op?.activeRateLimitLockouts ?? 0}
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)] mt-1 flex items-center justify-between">
            <span>{op?.rateLimitsTracked ?? 0} IPs tracked</span>
            <Link href="/admin/security" className="hover:text-[var(--accent)] inline-flex items-center">
              Security <ArrowUpRight className="w-2.5 h-2.5 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Runtime & Environment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory & Node Runtime */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Node.js Memory & Uptime
              </h2>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
              {sys?.nodeVersion}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-mono text-xs mb-1.5">
                <span className="text-[var(--text-secondary)]">Heap Allocation:</span>
                <span className="text-[var(--text-primary)] font-semibold">
                  {sys?.heapUsedMb ?? 0} MB / {sys?.heapTotalMb ?? 0} MB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round(((sys?.heapUsedMb ?? 0) / (sys?.heapTotalMb || 1)) * 100))}%`
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">RSS MEMORY</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">{sys?.rssMb ?? 0} MB</div>
              </div>
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">PROCESS UPTIME</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">{formatUptime(sys?.uptimeSeconds ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Incident Feed */}
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Recent Security Incidents
              </h2>
            </div>
            <Link
              href="/admin/security"
              className="font-mono text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
            >
              View all ({data?.recentIncidents.length || 0}) ↗
            </Link>
          </div>

          {(!data?.recentIncidents || data.recentIncidents.length === 0) ? (
            <div className="text-center py-8 font-mono text-xs text-[var(--text-muted)]">
              Zero security incidents recorded in current runtime buffer.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.recentIncidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  className="p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] flex items-start justify-between gap-3 font-mono text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{inc.type}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">[{inc.ip}]</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{inc.detail}</div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
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
      </div>
    </div>
  );
}
