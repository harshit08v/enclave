'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, X, Command, ShieldCheck, Lock, Radio, KeyRound, Globe2, Server } from 'lucide-react';
import { getStoredUser, saveUserSession, EnclaveUser } from '@/lib/authStore';
import { Button } from '@/components/ui/button';
import UserNavMenu from '@/components/app/UserNavMenu';
import CommandPalette from '@/components/app/CommandPalette';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<EnclaveUser | null>(null);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    const sessionUser = getStoredUser();
    if (!sessionUser) {
      router.push('/login');
      return;
    }
    setUser(sessionUser);
    setLoading(false);

    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('enclave_onboarded');
      if (!onboarded) {
        setShowOnboarding(true);
      }
    }
  }, [router]);

  // Real-time verification status check & multi-device sync
  useEffect(() => {
    if (!user || user.isGuest || user.isVerified || !user.email) return;

    let isMounted = true;
    let channel: BroadcastChannel | null = null;

    const checkVerification = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(user.email!)}&_t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isVerified && isMounted) {
            const updated = { ...user, isVerified: true };
            saveUserSession(updated, true);
            setUser(updated);
            return true;
          }
        }
      } catch {}
      return false;
    };

    // Immediate check
    checkVerification();

    // Fast 1.5s polling for instantaneous cross-device update when verified on phone
    const interval = setInterval(async () => {
      const verified = await checkVerification();
      if (verified) {
        clearInterval(interval);
      }
    }, 1500);

    // Multi-tab instant sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('enclave_auth_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'EMAIL_VERIFIED') {
            const updated = { ...user, isVerified: true };
            saveUserSession(updated, true);
            setUser(updated);
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'enclave_user_session' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.isVerified) {
            setUser({ ...user, isVerified: true });
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
  }, [user]);

  const handleResendVerification = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    setResendStatus(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email: user.email })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResendStatus(data.message || 'Verification email dispatched. Please check your inbox.');
      } else {
        setResendStatus(data.error || 'Failed to resend verification email.');
      }
    } catch {
      setResendStatus('Network error requesting resend.');
    } finally {
      setResending(false);
    }
  };

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enclave_onboarded', 'true');
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = joinRoomInput.trim().replace(/^https?:\/\/[^/]+\/r\//, '');
    if (cleanId) {
      router.push(`/r/${cleanId}`);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>CONNECTING TO ENCLAVE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="sm" href="/app" />

          <div className="flex items-center space-x-3">
            {/* Command Palette Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-mono transition-colors cursor-pointer"
            >
              <Command className="w-3.5 h-3.5" />
              <span>⌘K</span>
            </button>

            <UserNavMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main Workspace Console Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-start">
        {/* Unverified Account Warning Banner */}
        {user && !user.isGuest && user.isVerified === false && (
          <div className="mb-6 w-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left text-xs font-mono animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>EMAIL VERIFICATION PENDING</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Your account ({user.email}) must be verified before you can initialize encrypted rooms.
              </p>
              {resendStatus && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                  {resendStatus}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-colors font-medium text-xs cursor-pointer disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend Email'}
            </button>
          </div>
        )}

        {/* First-time Onboarding Note */}
        {showOnboarding && (
          <div className="mb-8 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-left relative shadow-xs animate-in fade-in">
            <button
              type="button"
              onClick={handleDismissOnboarding}
              aria-label="Dismiss welcome guide"
              className="absolute top-4 right-4 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                <span>WELCOME TO ENCLAVE</span>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Private chambers. Temporary conversations. No permanent archive.
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                ENCLAVE uses client-side End-to-End Encryption with CSPRNG session keys. Rooms dissolve immediately when all participants depart or inactivity expires.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border)] mt-3">
                <span>Create → Share → Talk → Leave → Dissolve</span>
                <button
                  type="button"
                  onClick={handleDismissOnboarding}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Title & Telemetry Header */}
        <div className="border-b border-[var(--border)] pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span>WORKSPACE ACTIVE</span>
              <span className="text-[var(--border-strong)]">/</span>
              <span className="text-[var(--text-primary)] font-semibold">{user.displayName || 'Host'}</span>
            </div>
            <h1 className="font-serif italic text-3xl sm:text-4xl font-normal text-[var(--text-primary)] tracking-tight">
              Ephemeral Chamber Deck
            </h1>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)]">
              WebCrypto AES-256-GCM
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--surface-muted)] border border-[var(--border)]">
              Double Ratchet v2
            </span>
          </div>
        </div>

        {/* 2-Column Console Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Action Column (8 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Initialize Chamber Block */}
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold text-[var(--accent)] uppercase tracking-wider">
                  NEW CHAMBER
                </span>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Initialize an encrypted room
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Generates an ephemeral Room Master Secret and key anchors entirely within local RAM. Choose between two-factor out-of-band passphrase or direct link access.
                </p>
              </div>

              <div className="pt-2">
                <Button asChild className="h-10 px-5 text-xs font-mono tracking-wider bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold">
                  <Link href="/app/new" className="flex items-center space-x-2">
                    <Plus className="w-3.5 h-3.5" />
                    <span>CREATE A ROOM</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Direct Join Block */}
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  ENTER ROOM
                </span>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Join with Room ID or Link
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Enter an 8-character Room ID or paste a full invitation link to enter an active chamber.
                </p>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={joinRoomInput}
                    onChange={(e) => setJoinRoomInput(e.target.value)}
                    placeholder="e.g. 8f92-c0e4 or https://enclave.vercel.app/r/..."
                    className="flex-1 bg-[var(--surface-muted)] border border-[var(--border-strong)] rounded-lg px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                  />
                  <Button
                    type="submit"
                    disabled={!joinRoomInput.trim()}
                    className="h-9 px-4 text-xs font-mono tracking-wider uppercase bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold shrink-0"
                  >
                    <span>ENTER ROOM</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Secondary Telemetry Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  ARCHITECTURE SPECIFICATION
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Cryptographic parameters &amp; relay invariants
                </p>
              </div>

              <div className="divide-y divide-[var(--border)] text-xs font-mono">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Runtime Cipher</span>
                  <span className="text-[var(--text-primary)] font-semibold">AES-256-GCM (96-bit IV)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Forward Secrecy</span>
                  <span className="text-[var(--accent)] font-semibold">Signal Double Ratchet</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Client Room KDF</span>
                  <span className="text-[var(--text-primary)] font-semibold">Argon2id (m=32MB, t=3)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Host Password Hash</span>
                  <span className="text-[var(--text-primary)] font-semibold">Argon2id (m=64MB, t=3)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Courier Relays</span>
                  <span className="text-[var(--text-primary)]">Volatile Redis (1h Max TTL)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Disk Retention</span>
                  <span className="text-[var(--accent)] font-semibold">Zero Message DB Retained</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                <Link href="/security" className="text-[var(--accent)] hover:underline flex items-center gap-1">
                  <span>Security overview</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <Link href="/how-it-works" className="text-[var(--text-secondary)] hover:underline">
                  Protocol details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Metadata */}
      <footer className="border-t border-[var(--border)] py-4 px-6 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[var(--text-muted)]">
          <div className="flex items-center space-x-2">
            <span>EPHEMERAL BY DESIGN · END-TO-END ENCRYPTED</span>
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
        <div className="max-w-5xl mx-auto pt-3 mt-3 border-t border-[var(--border)] text-center text-[11px] font-mono text-[var(--text-muted)]">
          Designed &amp; developed by{' '}
          <a
            href="https://mavqora.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] font-semibold transition-colors underline underline-offset-2"
          >
            MAVQORA
          </a>
        </div>
      </footer>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onTriggerJoin={() => {
          const el = document.querySelector('input[type="text"]') as HTMLInputElement;
          el?.focus();
        }}
      />
    </div>
  );
}
