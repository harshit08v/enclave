'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';

interface SettingsData {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  maxRoomLifetimeMs: number;
  waitingInactivityLimitMs: number;
  maxFileSizeMb: number;
  rateLimitMaxAttempts: number;
  rateLimitLockoutMs: number;
  allowedMimeTypes: string[];
}

export default function AdminSettingsPage() {
  const { csrfToken } = useAdminAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
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
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          setSettings(data.settings);
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
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-enclave-admin-csrf': csrfToken || ''
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setFeedback({ type: 'success', message: 'Platform settings updated and logged to audit trail.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update platform settings.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="p-12 text-center font-mono text-xs text-[var(--text-secondary)]">
        Loading platform runtime settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            RUNTIME PLATFORM SETTINGS
          </h1>
          <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
            Server-enforced runtime policies. Modifications take effect immediately without restarts.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded border text-xs font-mono flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {settings && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Maintenance Mode Toggle */}
          <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
                  Maintenance Mode
                </h3>
                <p className="font-mono text-[11px] text-[var(--text-secondary)] mt-0.5">
                  When enabled, public room creation will reject new requests with a maintenance notice.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
              </label>
            </div>

            {settings.maintenanceMode && (
              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                  Maintenance Notice Message
                </label>
                <input
                  type="text"
                  value={settings.maintenanceNotice}
                  onChange={(e) => setSettings({ ...settings, maintenanceNotice: e.target.value })}
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
          </div>

          {/* Lifecycle & Timeouts */}
          <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <h3 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase pb-2 border-b border-[var(--border)]">
              Room Lifecycle & Inactivity Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1">
                  Idle Room Reap Lifetime (seconds)
                </label>
                <input
                  type="number"
                  min={60}
                  max={86400}
                  value={Math.round(settings.maxRoomLifetimeMs / 1000)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxRoomLifetimeMs: (parseInt(e.target.value, 10) || 60) * 1000
                    })
                  }
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="font-mono text-[10px] text-[var(--text-muted)] mt-1 block">
                  Allowed range: 60s to 86,400s (24 hours)
                </span>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1">
                  Waiting State Idle Limit (seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={1800}
                  value={Math.round(settings.waitingInactivityLimitMs / 1000)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      waitingInactivityLimitMs: (parseInt(e.target.value, 10) || 30) * 1000
                    })
                  }
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="font-mono text-[10px] text-[var(--text-muted)] mt-1 block">
                  Allowed range: 30s to 1,800s (30 mins)
                </span>
              </div>
            </div>
          </div>

          {/* Rate Limiting & Media Upload */}
          <div className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
            <h3 className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase pb-2 border-b border-[var(--border)]">
              Abuse Defense & Encrypted Media Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1">
                  Max Auth Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.rateLimitMaxAttempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rateLimitMaxAttempts: parseInt(e.target.value, 10) || 5
                    })
                  }
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1">
                  Lockout Duration (seconds)
                </label>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={Math.round(settings.rateLimitLockoutMs / 1000)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rateLimitLockoutMs: (parseInt(e.target.value, 10) || 300) * 1000
                    })
                  }
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-[var(--text-secondary)] mb-1">
                  Max File Upload Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxFileSizeMb}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxFileSizeMb: parseInt(e.target.value, 10) || 25
                    })
                  }
                  className="w-full p-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'UPDATING POLICIES...' : 'APPLY CONFIGURATION'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
