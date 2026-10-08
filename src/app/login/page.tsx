'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { saveUserSession, EnclaveUser, createAnonymousUser } from '@/lib/authStore';
import { generateSecureId } from '@/packages/crypto';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const name = email.split('@')[0];
      const user: EnclaveUser = {
        id: generateSecureId('usr', 6),
        email: email.trim(),
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        avatarSeed: email.trim(),
        createdAt: Date.now()
      };

      saveUserSession(user, true);
      router.push('/app');
    }, 300);
  };

  const handleGuestLogin = () => {
    const guest = createAnonymousUser();
    saveUserSession(guest, false);
    router.push('/app');
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setResetMessage('For security, ENCLAVE never persists passwords. You can sign in as a guest or create a new session identity.');
    setError('');
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
              <Link href="/" className="inline-block group">
                <span className="font-mono text-base font-semibold tracking-widest text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  ENCLAVE
                </span>
              </Link>
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
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {resetMessage && (
                <div className="p-3.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-start space-x-2.5 text-xs text-[var(--accent)]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
                  <span className="leading-relaxed">{resetMessage}</span>
                </div>
              )}

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
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                      Forgot password?
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

              {/* Subtle Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-xs text-[var(--text-muted)]">
                  <span className="bg-[var(--surface)] px-3 font-mono text-[11px] uppercase tracking-wider">
                    or
                  </span>
                </div>
              </div>

              {/* Guest Access Option */}
              <Button
                type="button"
                variant="secondary"
                onClick={handleGuestLogin}
                className="w-full h-11 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
              >
                <span>Continue as guest</span>
              </Button>

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
