'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  FileCode,
  Users,
  Lock,
  Link2,
  Copy,
  Check,
  Radio,
  Clock,
  ShieldAlert,
  LogOut,
  Info,
  Flame
} from 'lucide-react';
import { RoomMeta, WirePacket, RoomLifecycleState } from '@/packages/protocol';
import { Button } from '@/components/ui/button';

interface RoomDetailsDrawerProps {
  roomId: string;
  roomMeta: RoomMeta | null;
  participantCount: number;
  roomState: RoomLifecycleState;
  connectionState: 'connected' | 'reconnecting' | 'disconnected';
  latestPacket: WirePacket | null;
  onOpenInspector: () => void;
  onOpenLeaveModal: () => void;
  onOpenDestroyModal: () => void;
  onClose: () => void;
}

export default function RoomDetailsDrawer({
  roomId,
  roomMeta,
  participantCount,
  roomState,
  connectionState,
  latestPacket,
  onOpenInspector,
  onOpenLeaveModal,
  onOpenDestroyModal,
  onClose
}: RoomDetailsDrawerProps) {
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const requirePass = roomMeta?.requirePass !== false;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--surface)] border-l border-[var(--border)] max-w-md w-full h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto overflow-x-hidden shadow-2xl relative animate-in slide-in-from-right duration-200 selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] scrollbar-auto-hide scroll-touch">
        {/* Top Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)]">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-medium text-[var(--text-primary)]">Room Details</h2>
                <p className="text-xs font-mono text-[var(--text-muted)]">Ephemeral session inspection</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. ROOM IDENTIFIER */}
          <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
            <div className="text-[10px] uppercase font-mono text-[var(--text-muted)] tracking-wider font-semibold">
              Room Identifier
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-semibold text-[var(--text-primary)] tracking-wide">
                {roomId}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyRoomId}
                className="h-8 px-3 text-xs font-mono font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3 h-3 text-[var(--accent)] mr-1.5" />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1.5 text-[var(--text-secondary)]" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 2. TECHNICAL STATUS METRICS */}
          <div className="space-y-2.5 font-mono text-xs">
            {/* Access Mode */}
            <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                {requirePass ? <Lock className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Link2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
                <span>Access Mode:</span>
              </span>
              <span className="text-[var(--accent)] font-semibold">
                {requirePass ? 'With access pass' : 'Anyone with the room link'}
              </span>
            </div>

            {/* Authoritative Presence */}
            <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Presence:</span>
              </span>
              <span className="text-[var(--text-primary)] font-semibold flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>{participantCount} {participantCount === 1 ? 'person here' : 'people here'}</span>
              </span>
            </div>

            {/* Connection Status */}
            <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>Connection:</span>
              </span>
              <span className={`font-semibold capitalize flex items-center space-x-1.5 ${
                connectionState === 'connected'
                  ? 'text-[var(--accent)]'
                  : connectionState === 'reconnecting'
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-[var(--accent)]'
                    : connectionState === 'reconnecting'
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-rose-600'
                }`} />
                <span>{connectionState === 'connected' ? 'Connected' : connectionState === 'reconnecting' ? 'Reconnecting' : 'Connection lost'}</span>
              </span>
            </div>

            {/* Room Lifecycle State */}
            <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Lifecycle State:</span>
              </span>
              <span className="text-[var(--text-primary)] font-semibold tracking-wider">
                {roomState}
              </span>
            </div>
          </div>

          {/* 3. SECURITY TRANSPARENCY PANEL */}
          <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold uppercase text-[var(--accent)]">
              <ShieldCheck className="w-4 h-4" />
              <span>Security & Transparency</span>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">End-to-end encrypted: </span>
                Messages and media are encrypted locally with AES-256-GCM before transmission.
              </div>

              <div>
                <span className="font-semibold text-[var(--text-primary)]">Blind server relay: </span>
                The server routes encrypted ciphertext only and cannot inspect message plaintext.
              </div>

              <div>
                <span className="font-semibold text-[var(--text-primary)]">Ephemeral memory: </span>
                This room and all in-transit buffers are immediately zeroized when the lifecycle ends.
              </div>

              <div className="pt-1 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]">
                <span className="font-semibold text-[var(--text-secondary)]">Security boundaries: </span>
                Encryption protects network transmission but cannot prevent physical screenshots or compromised local devices.
              </div>
            </div>
          </div>

          {/* Raw Wire Packet Inspector */}
          {latestPacket && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenInspector();
              }}
              className="w-full text-xs h-9 border-[var(--border)]"
            >
              <FileCode className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
              <span>Inspect Raw Wire Packet</span>
            </Button>
          )}
        </div>

        {/* Bottom Drawer Actions */}
        <div className="pt-6 border-t border-[var(--border)] space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLeaveModal();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] hover:bg-[var(--border)] text-[var(--text-primary)] text-xs font-mono transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Leave room</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDestroyModal();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-mono transition-colors flex items-center justify-center space-x-2 cursor-pointer font-semibold"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Leave & Destroy Room</span>
          </button>
        </div>
      </div>
    </div>
  );
}
