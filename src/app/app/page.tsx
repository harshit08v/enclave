'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, X, Command } from 'lucide-react';
import { getStoredUser, EnclaveUser } from '@/lib/authStore';
import { Button } from '@/components/ui/button';
import UserNavMenu from '@/components/app/UserNavMenu';
import CommandPalette from '@/components/app/CommandPalette';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<EnclaveUser | null>(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between relative selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Subtle Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-grid-subtle"
      />

      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo size="sm" href="/app" />

          <div className="flex items-center space-x-3">
            {/* Command Palette Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-mono transition-colors cursor-pointer"
            >
              <Command className="w-3.5 h-3.5" />
              <span>⌘K</span>
            </button>

            <UserNavMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col justify-center items-center text-center relative z-10 space-y-8">
        {/* First-time Onboarding Card */}
        {showOnboarding && (
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 text-left relative shadow-xs animate-in fade-in slide-in-from-top-2">
            <button
              type="button"
              onClick={handleDismissOnboarding}
              aria-label="Dismiss welcome guide"
              className="absolute top-4 right-4 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                <span>WELCOME TO ENCLAVE</span>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Private rooms. Temporary conversations. No permanent archive.
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                ENCLAVE uses client-side End-to-End Encryption with CSPRNG session keys. Rooms dissolve immediately when all participants depart or inactivity expires.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border)] mt-3">
                <span>Create → Share → Talk → Leave → Destroy</span>
                <button
                  type="button"
                  onClick={handleDismissOnboarding}
                  className="text-[var(--accent)] hover:underline font-semibold"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8 animate-fade-in max-w-lg w-full">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] font-mono font-semibold text-[var(--accent)] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>PRIVATE WORKSPACE</span>
          </div>

          {/* Editorial Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[var(--text-primary)] tracking-tight leading-[1.1]">
              Nothing here.<br />
              <span className="text-[var(--accent)] font-medium">That&apos;s the point.</span>
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed pt-2">
              Your conversations aren&apos;t meant to become an archive.
            </p>
          </div>

          {/* Thin Divider */}
          <div className="w-16 h-px bg-[var(--border)] mx-auto" />

          {/* Action Area */}
          {!showJoinInput ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-7 text-xs font-mono tracking-wider bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white">
                <Link href="/app/new" className="flex items-center justify-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>CREATE A ROOM</span>
                </Link>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setShowJoinInput(true)}
                className="w-full sm:w-auto h-12 px-7 text-xs font-mono tracking-wider font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <span>ENTER A ROOM</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-7 shadow-xs max-w-md mx-auto w-full text-left space-y-4 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    ENTER A ROOM
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Enter the Room ID to join an existing room.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJoinInput(false)}
                  className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline p-1"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <input
                  type="text"
                  required
                  value={joinRoomInput}
                  onChange={(e) => setJoinRoomInput(e.target.value)}
                  placeholder="e.g. 8f92-c0e4"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border-strong)] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                  autoFocus
                />

                <Button
                  type="submit"
                  disabled={!joinRoomInput.trim()}
                  className="w-full h-11 text-xs font-mono tracking-wider uppercase bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold"
                >
                  <span>ENTER ROOM</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>

              <p className="text-[11px] font-mono text-[var(--text-muted)] text-center pt-1 border-t border-[var(--border)]">
                Have a room link? Open it directly in your browser.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Metadata */}
      <footer className="border-t border-[var(--border)] py-5 px-6 bg-[var(--background)] relative z-10">
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
      </footer>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onTriggerJoin={() => setShowJoinInput(true)}
      />
    </div>
  );
}
