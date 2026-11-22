'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Phone,
  Video,
  Flame,
  Copy,
  Check,
  MoreHorizontal,
  Info,
  LogOut,
  Flame as FlameIcon
} from 'lucide-react';
import { RoomMeta, RoomParticipant } from '@/packages/protocol';

export interface RoomHeaderProps {
  roomId: string;
  roomMeta: RoomMeta | null;
  participants: RoomParticipant[];
  isOwner: boolean;
  isVerified: boolean;
  onOpenSafety: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onOpenDetails: () => void;
  onOpenLeave: (mode: 'leave' | 'destroy') => void;
  onOpenPrivacy: () => void;
  disappearingTimer: number | null;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  copiedLink: boolean;
  onCopyLink: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  roomMeta,
  participants,
  isOwner,
  isVerified,
  onOpenSafety,
  onStartCall,
  onOpenDetails,
  onOpenLeave,
  onOpenPrivacy,
  disappearingTimer,
  connectionState,
  copiedLink,
  onCopyLink
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const activeParticipantsCount = participants.length;

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between shrink-0 select-none z-20 transition-colors">
      {/* Left: Brand Emblem & Room Identity */}
      <div className="flex items-center space-x-3 min-w-0">
        <Link
          href="/"
          className="flex items-center space-x-2.5 group shrink-0 focus:outline-none"
          title="Return to ENCLAVE Home"
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--border)] bg-[#0C120F] flex items-center justify-center transition-transform group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="ENCLAVE" className="w-full h-full object-cover" />
          </div>
        </Link>

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate tracking-tight">
              {`Chamber ${roomId.slice(0, 8)}`}
            </h1>
            {isOwner && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] shrink-0 font-medium">
                HOST
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center space-x-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : connectionState === 'reconnecting'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="capitalize">{connectionState}</span>
            </span>
            <span>·</span>
            <span>{activeParticipantsCount} {activeParticipantsCount === 1 ? 'present' : 'present'}</span>
          </div>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        {/* Safety Number Button */}
        <button
          onClick={onOpenSafety}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            isVerified
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15'
              : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brass)] hover:text-[var(--brass)]'
          }`}
          title="Verify E2EE Safety Number"
        >
          {isVerified ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="hidden sm:inline">{isVerified ? 'VERIFIED' : 'VERIFY KEYS'}</span>
        </button>

        {/* Ephemeral Timer Indicator (if set) */}
        {disappearingTimer && disappearingTimer > 0 && (
          <button
            onClick={onOpenPrivacy}
            className="flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono hover:bg-amber-500/20 transition-colors"
            title={`Disappearing Messages Active (${Math.round(disappearingTimer / 1000)}s)`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{Math.round(disappearingTimer / 1000)}s</span>
          </button>
        )}

        {/* Audio Call */}
        <button
          onClick={() => onStartCall('audio')}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-transparent hover:border-[var(--border)] transition-colors focus:outline-none"
          title="Start End-to-End Encrypted Voice Call"
          aria-label="Start Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>

        {/* Video Call */}
        <button
          onClick={() => onStartCall('video')}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-transparent hover:border-[var(--border)] transition-colors focus:outline-none"
          title="Start End-to-End Encrypted Video Call"
          aria-label="Start Video Call"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Overflow Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-transparent hover:border-[var(--border)] transition-colors focus:outline-none"
            aria-label="Chamber Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-1.5 z-50 text-xs font-mono space-y-0.5 animate-in fade-in duration-150">
              <button
                onClick={() => {
                  onCopyLink();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors text-left"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Chamber Link'}</span>
              </button>

              <button
                onClick={() => {
                  onOpenDetails();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors text-left"
              >
                <Info className="w-4 h-4" />
                <span>Chamber Details & Keys</span>
              </button>

              <button
                onClick={() => {
                  onOpenPrivacy();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors text-left"
              >
                <FlameIcon className="w-4 h-4 text-amber-500" />
                <span>Disappearing Messages</span>
              </button>

              <div className="border-t border-[var(--border)] my-1" />

              <button
                onClick={() => {
                  onOpenLeave(isOwner ? 'destroy' : 'leave');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>{isOwner ? 'Destroy Chamber (All)' : 'Leave Chamber'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default RoomHeader;
