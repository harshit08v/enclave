'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { saveUserSession, getStoredUser, setCachedAuthToken, EnclaveUser } from '@/lib/authStore';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/ui/BrandLogo';

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'Sign In | ENCLAVE — Ephemeral Private Communication';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
      const existingUser = getStoredUser();
      if (existingUser && !existingUser.isVerified && existingUser.email) {
        setUnverifiedEmail(existingUser.email);
        setVerificationPending(true);
      }
    }
  }, []);

  // Real-time verification polling: auto-detects when user verifies on phone, tablet, or another tab
  React.useEffect(() => {
    if (!verificationPending || isVerifiedSuccess || !unverifiedEmail) return;

    let isMounted = true;
    let channel: BroadcastChannel | null = null;

    const checkVerificationStatus = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(unverifiedEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isVerified && isMounted) {
            const localUser = getStoredUser();
            if (localUser) {
              saveUserSession({ ...localUser, isVerified: true }, true);
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
            setIsVerifiedSuccess(true);
            return true;
          }
        }

        // Check Firebase user sync if active
        try {
          const { getFirebaseAuth } = await import('@/lib/firebaseClient');
          const auth = getFirebaseAuth();
          if (auth.currentUser) {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified && isMounted) {
              const localUser = getStoredUser();
              if (localUser) {
                saveUserSession({ ...localUser, isVerified: true }, true);
              }
              setIsVerifiedSuccess(true);
              return true;
            }
          }
        } catch {
          // ignore firebase polling error
        }
      } catch {
        // network polling error - retry on next tick
      }
      return false;
    };

    // Immediate check
    checkVerificationStatus();

    // High-responsiveness 1.2 second polling for instant cross-device detection
    const interval = setInterval(async () => {
      const verified = await checkVerificationStatus();
      if (verified) {
        clearInterval(interval);
      }
    }, 1200);

    // Multi-tab instant synchronization
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('enclave_auth_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'EMAIL_VERIFIED') {
            const localUser = getStoredUser();
            if (localUser) {
              saveUserSession({ ...localUser, isVerified: true }, true);
            }
            setIsVerifiedSuccess(true);
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'enclave_user_session' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.isVerified) {
            setIsVerifiedSuccess(true);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      try {
        channel?.close();
      } catch {}
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [verificationPending, isVerifiedSuccess, unverifiedEmail]);

  // Smooth auto-transition into Enclave once verified
  React.useEffect(() => {
    if (isVerifiedSuccess) {
      const timer = setTimeout(() => {
        router.push('/app');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVerifiedSuccess, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setAccountNotFound(false);
    setResetMessage('');
    setGoogleLoading(true);

    try {
      const { signInWithGoogle, getFirebaseIdToken } = await import('@/lib/firebaseClient');
      const { user: fbUser } = await signInWithGoogle();
      const token = await getFirebaseIdToken();

      const user: EnclaveUser = {
        id: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        avatarSeed: fbUser.email || fbUser.uid,
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: Date.now(),
        isVerified: fbUser.emailVerified, // Google accounts are verified by default
        provider: 'google.com',
        idToken: token || undefined
      };

      setCachedAuthToken(token);
      saveUserSession(user, true);
      router.push('/app');
    } catch (err: unknown) {
      const { mapFirebaseError } = await import('@/lib/firebaseClient');
      setError(mapFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAccountNotFound(false);
    setResetMessage('');

    const trimmedEmail = email.trim();

    // 1. Client-side input validation
    if (!trimmedEmail && !password) {
      setError('Please enter both your email and password.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      // 2. Attempt Firebase Authentication
      const { signInWithEmail, getFirebaseIdToken, mapFirebaseError } = await import('@/lib/firebaseClient');

      try {
        const { user: fbUser } = await signInWithEmail(trimmedEmail, password);
        const token = await getFirebaseIdToken();

        // Enforce email verification for email/password accounts
        if (!fbUser.emailVerified) {
          const statusRes = await fetch(`/api/auth/register?email=${encodeURIComponent(trimmedEmail)}`).then(r => r.json()).catch(() => null);
          if (!statusRes?.isVerified) {
            setUnverifiedEmail(fbUser.email || trimmedEmail);
            setVerificationPending(true);
            setPassword('');
            setLoading(false);
            return;
          }
        }

        const verifiedUser: EnclaveUser = {
          id: fbUser.uid,
          email: fbUser.email || trimmedEmail,
          displayName: fbUser.displayName || trimmedEmail.split('@')[0],
          avatarSeed: fbUser.email || trimmedEmail,
          avatarUrl: fbUser.photoURL || undefined,
          createdAt: Date.now(),
          isVerified: true,
          provider: 'password',
          idToken: token || undefined
        };

        setCachedAuthToken(token);
        saveUserSession(verifiedUser, true);
        router.push('/app');
        return;
      } catch (fbErr: any) {
        // Clear password while retaining email
        setPassword('');

        // Safe migration fallback: check existing serverUserStore accounts
        if (fbErr?.code === 'auth/invalid-credential' || fbErr?.code === 'auth/user-not-found') {
          const legacyRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmedEmail, password })
          });
          const legacyData = await legacyRes.json().catch(() => ({}));

          if (legacyRes.ok && legacyData.success) {
            const legacyUser: EnclaveUser = {
              id: legacyData.user.id,
              email: legacyData.user.email,
              displayName: legacyData.user.displayName,
              avatarSeed: legacyData.user.avatarSeed || legacyData.user.email,
              createdAt: Date.now(),
              isVerified: true,
              provider: 'legacy'
            };
            saveUserSession(legacyUser, true);
            router.push('/app');
            return;
          } else if (legacyData.requiresVerification) {
            setUnverifiedEmail(legacyData.email || trimmedEmail);
            setVerificationPending(true);
            setLoading(false);
            return;
          }
        }

        if (fbErr?.code === 'auth/user-not-found') {
          setAccountNotFound(true);
        }
        setError(mapFirebaseError(fbErr));
      }
    } catch {
      setPassword('');
      setError('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail || resending) return;
    setResending(true);
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email: unverifiedEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResendMessage(data.message || 'Verification email dispatched via Brevo. Please check your inbox.');
      } else {
        setResendMessage(data.error || 'Failed to resend verification email.');
      }
    } catch {
      setResendMessage('Network error communicating with verification server.');
    } finally {
      setResending(false);
    }
  };


  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address to request a password reset.');
      return;
    }

    setResetLoading(true);
    try {
      const { resetUserPassword, mapFirebaseError } = await import('@/lib/firebaseClient');
      await resetUserPassword(trimmedEmail);
      setResetMessage(`Password reset email dispatched to ${trimmedEmail}. Please check your inbox.`);
    } catch (err: unknown) {
      const { mapFirebaseError } = await import('@/lib/firebaseClient');
      setError(mapFirebaseError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between relative selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Subtle Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-grid-subtle"
      />

      {/* Main Authentication Viewport */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* LEFT BRAND PANEL (Desktop Editorial Anchor) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8 lg:space-y-12">
            {/* Top Logo */}
            <div>
              <BrandLogo size="md" showTagline={true} />
            </div>

            {/* Editorial Statement */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-[var(--text-primary)] tracking-tight leading-[1.15]">
                Private by design.<br />
                <span className="text-[var(--text-secondary)]">Gone when you leave.</span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                A private room for conversations that don&apos;t need to stay. Ephemeral key derivation with zero persistent server storage.
              </p>
            </div>

            {/* Invariant Pillars */}
            <div className="space-y-2.5 pt-2 border-t border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Zero permanent chat logs or plaintext storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Client-side AES-256-GCM encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Definitive memory zeroization on dissolution</span>
              </div>
            </div>

            {/* Bottom Indicator */}
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-[var(--text-muted)] tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span>PRIVATE COMMUNICATION, REIMAGINED</span>
            </div>
          </div>

          {/* RIGHT AUTHENTICATION FORM */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 shadow-xs max-w-md w-full space-y-6">
              
              {/* Form Heading */}
              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[var(--text-primary)]">
                  Welcome back.
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Enter your credentials to continue to your private space.
                </p>
              </div>

              {/* Feedback Banners */}
              {error && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 space-y-2 text-xs text-rose-700 dark:text-rose-400">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                  {accountNotFound && (
                    <div className="pt-1 pl-6.5">
                      <Link
                        href={`/signup?email=${encodeURIComponent(email.trim())}`}
                        className="inline-flex items-center text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Create an account with this email &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {resetMessage && (
                <div className="p-3.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-start space-x-2.5 text-xs text-[var(--accent)]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
                  <span className="leading-relaxed">{resetMessage}</span>
                </div>
              )}

              {/* Verification Completed Screen: Welcome to ENCLAVE */}
              {isVerifiedSuccess ? (
                <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-300">
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
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                      Welcome to ENCLAVE
                    </h3>
                    <p className="text-sm font-medium text-[var(--accent)] tracking-wide">
                      The World of Privacy
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1 max-w-sm mx-auto">
                      Your account is verified. Entering your private vault...
                    </p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button
                      type="button"
                      onClick={() => router.push('/app')}
                      className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs tracking-wider font-semibold shadow-sm"
                    >
                      <span>ENTER ENCLAVE</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : verificationPending ? (
                <div className="space-y-6 text-center py-4 animate-in fade-in duration-200">
                  <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                      Email verification required
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                      Your account for <strong className="text-[var(--text-primary)]">{unverifiedEmail}</strong> requires email verification before access is granted. Please click the link on this device or your mobile phone to activate your ENCLAVE account.
                    </p>
                  </div>

                  {/* Real-time sync radar indicator */}
                  <div className="flex items-center justify-center space-x-2 text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--surface-muted)] py-2.5 px-3 rounded-lg border border-[var(--border)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Waiting for email verification… (Auto-detecting)</span>
                  </div>

                  {resendMessage && (
                    <div className="p-3 rounded bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">
                      {resendMessage}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <Button
                      type="button"
                      disabled={resending}
                      onClick={handleResend}
                      variant="secondary"
                      className="w-full h-10 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)]"
                    >
                      <span>{resending ? 'Dispatching email…' : 'Resend verification email'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setVerificationPending(false);
                        setResendMessage(null);
                        setError('');
                      }}
                      className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono"
                    >
                      Return to sign in
                    </Button>
                  </div>

                  <p className="font-mono text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                    Links expire in 30 minutes. If you verify from your phone, this screen will update automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Google Sign-In Button */}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={googleLoading || loading}
                    onClick={handleGoogleSignIn}
                    className="w-full h-11 flex items-center justify-center space-x-3 text-sm font-medium border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] transition-all shadow-xs"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>{googleLoading ? 'Connecting with Google…' : 'Continue with Google'}</span>
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border)]" />
                    </div>
                    <div className="relative flex justify-center text-xs text-[var(--text-muted)]">
                      <span className="bg-[var(--surface)] px-3 font-mono text-[11px] uppercase tracking-wider">
                        or with email
                      </span>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Address */}
                  <div>
                    <label 
                      htmlFor="login-email" 
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Password with Visibility Toggle & Forgot Password Link */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label 
                        htmlFor="login-password" 
                        className="block text-sm font-medium text-[var(--text-primary)]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resetLoading}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {resetLoading ? 'Sending link…' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none p-1 cursor-pointer transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Sign In Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                      size="lg"
                    >
                      <span>{loading ? 'Signing in…' : 'Sign in'}</span>
                      {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
                    </Button>
                  </div>
                </form>
                </div>
              )}

              {/* Subtle Divider */}
              {/* Switch to Signup */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Don&apos;t have an account?</span>
                <Link 
                  href="/signup" 
                  className="text-[var(--accent)] font-medium hover:underline transition-colors"
                >
                  Create an account
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Minimal Authentication Footer */}
      <footer className="border-t border-[var(--border)] py-4 px-6 bg-[var(--background)] relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[var(--text-primary)] font-semibold">ENCLAVE</span>
            <span>·</span>
            <span>Private communication, reimagined.</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">
              Security
            </Link>
            <Link href="/how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
              How It Works
            </Link>
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
