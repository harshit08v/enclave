'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, KeyRound, Eye, EyeOff, Lock, RefreshCw } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { clearUserSession } from '@/lib/authStore';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'VALIDATING' | 'VALID' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('VALIDATING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Reset Password | ENCLAVE — Ephemeral Private Communication';
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus('ERROR');
      setErrorMessage('No password reset token provided. Please check the link from your email.');
      return;
    }

    let isMounted = true;

    const verifyToken = async () => {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', token: token.trim() })
        });
        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (res.ok && data.valid) {
          setStatus('VALID');
          setAccountEmail(data.email || null);
        } else {
          setStatus('ERROR');
          setErrorMessage(data.error || 'Password reset link is invalid, expired, or has already been used.');
        }
      } catch {
        if (isMounted) {
          setStatus('ERROR');
          setErrorMessage('Network error communicating with password reset server.');
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter both fields.');
      return;
    }

    setStatus('SUBMITTING');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          token: token?.trim(),
          newPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Invalidate any local existing session for security
        clearUserSession();
        setStatus('SUCCESS');
      } else {
        setStatus('VALID');
        setErrorMessage(data.error || 'Failed to update password. Please try again.');
      }
    } catch {
      setStatus('VALID');
      setErrorMessage('Network error submitting password reset.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-6 text-[var(--foreground)]">
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] rounded-2xl p-8 shadow-xs space-y-6">
        {/* Brand Stamp */}
        <div className="flex justify-center pb-2 border-b border-[var(--border)]">
          <BrandLogo size="md" />
        </div>

        {/* State 1: VALIDATING */}
        {status === 'VALIDATING' && (
          <div className="py-10 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
            <div className="font-mono text-xs text-[var(--text-secondary)] tracking-wider uppercase">
              VALIDATING CRYPTOGRAPHIC RESET TOKEN...
            </div>
          </div>
        )}

        {/* State 2: VALID (Form View) */}
        {(status === 'VALID' || status === 'SUBMITTING') && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                Create New Password
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {accountEmail ? (
                  <>Set a new secure password for <strong className="text-[var(--text-primary)]">{accountEmail}</strong></>
                ) : (
                  'Choose a new strong password for your ENCLAVE account.'
                )}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-[var(--text-secondary)] uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-[var(--text-secondary)] uppercase">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={status === 'SUBMITTING'}
              className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider font-semibold shadow-xs"
            >
              <span>{status === 'SUBMITTING' ? 'UPDATING CREDENTIALS...' : 'UPDATE PASSWORD'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="font-mono text-[10px] text-[var(--text-muted)] text-center pt-2">
              Password will be derived using memory-hard Argon2id. Plaintext is never stored.
            </p>
          </form>
        )}

        {/* State 3: SUCCESS */}
        {status === 'SUCCESS' && (
          <div className="space-y-6 text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center relative z-10 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                ● Password Updated
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Security Credentials Changed
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                Your account password has been updated. You can now sign in with your new credentials.
              </p>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider font-semibold shadow-sm">
                <Link href="/login" className="flex items-center justify-center">
                  <span>SIGN IN NOW</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* State 4: ERROR */}
        {status === 'ERROR' && (
          <div className="space-y-6 text-center py-2 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                Reset Link Invalid or Expired
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                {errorMessage || 'This password reset link is invalid, expired, or has already been consumed.'}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Button asChild className="w-full h-10 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider">
                <Link href="/login" className="flex items-center justify-center">
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Invariant Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>ZERO-KNOWLEDGE AUTHENTICATION ARCHITECTURE</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
          LOADING CREDENTIAL RECOVERY PORTAL...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
