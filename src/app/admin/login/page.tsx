'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      router.push('/admin');
    } else {
      setError(result.error || 'Authentication rejected.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-6 text-[var(--foreground)]">
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] rounded-xl p-8 shadow-sm">
        {/* Brand Stamp */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-[var(--text-primary)] tracking-wider">
                ENCLAVE
              </div>
              <div className="font-mono text-[10px] text-[var(--text-secondary)]">
                OPERATIONAL CONTROL
              </div>
            </div>
          </div>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
            SECURE ACCESS
          </span>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-rose-800 dark:text-rose-200">
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Operator Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
              Admin Password / Secret
            </label>
            <div className="relative">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <KeyRound className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded bg-[var(--accent)] text-white text-xs font-mono font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>VERIFYING CREDENTIALS...</span>
            ) : (
              <>
                <span>AUTHENTICATE OPERATOR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-[var(--border)]">
          <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed text-center">
            Zero Backdoor Guarantee: Administrative access provides operational routing and rate limit controls. No admin session has access to plaintext message contents or cryptographic room keys.
          </p>
        </div>
      </div>
    </div>
  );
}
