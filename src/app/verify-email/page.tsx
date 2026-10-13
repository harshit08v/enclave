'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Mail, RefreshCw } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { getStoredUser, saveUserSession } from '@/lib/authStore';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  const effectiveCode = (mode === 'verifyEmail' && oobCode) ? oobCode : (oobCode || token);
  const hasToken = Boolean(effectiveCode && effectiveCode.trim().length > 0);

  const [state, setState] = useState<'INITIAL' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>(
    hasToken ? 'INITIAL' : 'ERROR'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasToken ? null : 'No verification token provided in URL. Please check the link from your email.'
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendInput, setResendInput] = useState('');

  const handleConfirmVerification = React.useCallback(async () => {
    if (!effectiveCode) return;
    setState('VERIFYING');
    setErrorMessage(null);

    // 1. Try Firebase applyActionCode if it is an oobCode or mode is verifyEmail
    if (oobCode || mode === 'verifyEmail') {
      try {
        const { verifyFirebaseEmailCode, mapFirebaseError, getFirebaseIdToken } = await import('@/lib/firebaseClient');
        await verifyFirebaseEmailCode(effectiveCode.trim());
        setState('SUCCESS');

        const localUser = getStoredUser();
        if (localUser) {
          const freshToken = await getFirebaseIdToken(true).catch(() => null);
          saveUserSession({
            ...localUser,
            isVerified: true,
            idToken: freshToken || localUser.idToken
          }, true);
          setUserEmail(localUser.email);
        }
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('enclave_auth_sync');
            bc.postMessage({ type: 'EMAIL_VERIFIED', email: localUser?.email });
            bc.close();
          }
        } catch {}
        return;
      } catch (fbErr: any) {
        // If not recognized by Firebase, check server fallback
        const { mapFirebaseError } = await import('@/lib/firebaseClient');
        setErrorMessage(mapFirebaseError(fbErr));
      }
    }

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          token: effectiveCode.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setState('SUCCESS');
        setUserEmail(data.user?.email || null);

        // Update local session if currently active, or initialize session if opened on fresh device
        const localUser = getStoredUser();
        if (localUser && (localUser.id === data.user?.id || localUser.email?.toLowerCase() === data.user?.email?.toLowerCase())) {
          saveUserSession({
            ...localUser,
            isVerified: true
          }, true);
        } else if (data.user) {
          saveUserSession({
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName,
            avatarSeed: data.user.email,
            createdAt: Date.now(),
            isVerified: true,
            provider: 'password'
          }, true);
        }

        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('enclave_auth_sync');
            bc.postMessage({ type: 'EMAIL_VERIFIED', email: data.user?.email });
            bc.close();
          }
        } catch {}
      } else {
        setState('ERROR');
        setErrorMessage(data.error || 'Failed to verify email address.');
      }
    } catch {
      setState('ERROR');
      setErrorMessage('Network error communicating with verification server.');
    }
  }, [effectiveCode, oobCode, mode]);

  React.useEffect(() => {
    if (hasToken && state === 'INITIAL') {
      handleConfirmVerification();
    }
  }, [hasToken, state, handleConfirmVerification]);

  // Smooth auto-transition into Enclave once verified
  React.useEffect(() => {
    if (state === 'SUCCESS') {
      const timer = setTimeout(() => {
        router.push('/app');
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendInput.trim() || userEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      setResendMessage('Please enter a valid email address.');
      return;
    }

    setResending(true);
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          email: targetEmail
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || 'If an account exists, a new link has been dispatched.');
      } else {
        setResendMessage(data.error || 'Failed to dispatch verification email.');
      }
    } catch {
      setResendMessage('Network error while requesting resend.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-6 text-[var(--foreground)]">
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--surface)] rounded-2xl p-8 shadow-xs space-y-6">
        {/* Brand Stamp */}
        <div className="flex justify-center pb-2 border-b border-[var(--border)]">
          <BrandLogo size="md" />
        </div>

        {/* State 1: INITIAL with confirmation action */}
        {state === 'INITIAL' && (
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                Confirm Email Verification
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Click below to complete email verification and activate your ENCLAVE account privileges.
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleConfirmVerification}
                className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider"
              >
                <span>VERIFY MY EMAIL</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <p className="font-mono text-[10px] text-[var(--text-muted)]">
              This verification link expires after 30 minutes from generation.
            </p>
          </div>
        )}

        {/* State 2: VERIFYING */}
        {state === 'VERIFYING' && (
          <div className="py-10 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
            <div className="font-mono text-xs text-[var(--text-secondary)] tracking-wider uppercase">
              VALIDATING CRYPTOGRAPHIC TOKEN...
            </div>
          </div>
        )}

        {/* State 3: SUCCESS (Welcome to ENCLAVE — The World of Privacy) */}
        {state === 'SUCCESS' && (
          <div className="space-y-6 text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center relative z-10 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                ● Email Verified
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Welcome to ENCLAVE
              </h2>
              <p className="text-sm font-medium text-[var(--accent)] tracking-wide">
                The World of Privacy
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1 max-w-sm mx-auto">
                Your account is now activated. Your cryptographic identity is primed for zero-knowledge end-to-end encrypted communication.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Button asChild className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider font-semibold shadow-sm">
                <Link href="/app" className="flex items-center justify-center">
                  <span>ENTER ENCLAVE</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* State 4: ERROR */}
        {state === 'ERROR' && (
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                Verification Link Invalid or Expired
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                {errorMessage || 'This verification link is invalid, expired, or has already been used.'}
              </p>
            </div>

            {/* Resend Form */}
            <form onSubmit={handleResend} className="pt-2 space-y-3 text-left">
              <label className="block font-mono text-[11px] text-[var(--text-secondary)] uppercase">
                Resend verification email
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={resendInput}
                onChange={(e) => setResendInput(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />

              <Button
                type="submit"
                disabled={resending}
                variant="secondary"
                className="w-full h-10 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
              >
                <span>{resending ? 'Dispatching...' : 'Request New Verification Link'}</span>
              </Button>
            </form>

            {resendMessage && (
              <div className="p-3 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">
                {resendMessage}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border)]">
              <Link href="/login" className="text-xs font-mono text-[var(--accent)] hover:underline">
                Return to Sign in ↗
              </Link>
            </div>
          </div>
        )}

        {/* Security Invariant Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>ZERO-KNOWLEDGE AUTHENTICATION</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
          LOADING VERIFICATION PORTAL...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
