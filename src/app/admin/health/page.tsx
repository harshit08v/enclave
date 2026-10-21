'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, ShieldCheck, RefreshCw } from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: number;
  process: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
      externalMb: number;
    };
  };
  subsystems: {
    roomStore: {
      status: string;
      activeRooms: number;
    };
    cryptoSubtle: {
      status: string;
    };
    auditStore: {
      status: string;
    };
  };
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
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
        const res = await fetch('/api/admin/health', { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          setHealth(data);
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            SYSTEM HEALTH & RUNTIME METRICS
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Real process telemetry, memory allocation, and cryptographic engine status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] font-mono text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Diagnostics</span>
          </button>
        </div>
      </div>

      {loading && !health ? (
        <div className="p-12 text-center font-mono text-xs text-[var(--text-secondary)]">
          Collecting subsystem telemetry...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subsystem Readiness Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[var(--text-secondary)] uppercase">
                  In-Memory Room Store
                </span>
                <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {health?.subsystems.roomStore.status}
              </div>
              <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
                {health?.subsystems.roomStore.activeRooms} active room records
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[var(--text-secondary)] uppercase">
                  Cryptographic Engine
                </span>
                <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {health?.subsystems.cryptoSubtle.status}
              </div>
              <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
                AES-256-GCM / WebCrypto engine
              </div>
            </div>

            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[var(--text-secondary)] uppercase">
                  Audit Subsystem
                </span>
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {health?.subsystems.auditStore.status}
              </div>
              <div className="font-mono text-[11px] text-[var(--text-muted)] mt-1">
                Append-only in-memory ring buffer
              </div>
            </div>
          </div>

          {/* Process Telemetry */}
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--border)]">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
                Node.js Process Telemetry
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">HEAP USED</div>
                <div className="font-bold text-[var(--text-primary)] mt-1">
                  {health?.process.memory.heapUsedMb} MB
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">HEAP TOTAL</div>
                <div className="font-bold text-[var(--text-primary)] mt-1">
                  {health?.process.memory.heapTotalMb} MB
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">RSS (TOTAL)</div>
                <div className="font-bold text-[var(--text-primary)] mt-1">
                  {health?.process.memory.rssMb} MB
                </div>
              </div>
              <div className="p-3 rounded bg-[var(--surface-muted)]">
                <div className="text-[var(--text-muted)] text-[10px]">PID / ARCH</div>
                <div className="font-bold text-[var(--text-primary)] mt-1">
                  {health?.process.pid} / {health?.process.arch}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
