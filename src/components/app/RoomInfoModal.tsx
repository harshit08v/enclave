'use client';

import React from 'react';
import { X, ShieldCheck, FileCode, Users, Lock, Link2 } from 'lucide-react';
import { RoomMeta, WirePacket } from '@/packages/protocol';
import { Button } from '@/components/ui/button';

interface RoomInfoModalProps {
  roomMeta: RoomMeta | null;
  participantCount: number;
  latestPacket: WirePacket | null;
  onOpenInspector: () => void;
  onClose: () => void;
}

export default function RoomInfoModal({
  roomMeta,
  participantCount,
  latestPacket,
  onOpenInspector,
  onClose
}: RoomInfoModalProps) {
  if (!roomMeta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--accent)] font-semibold uppercase mb-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Room Details</span>
            </div>
            <h3 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
              Private Room
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Overview */}
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Room Identifier:</span>
            <span className="text-[var(--text-primary)] font-semibold">{roomMeta.id}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              {roomMeta.requirePass !== false ? <Lock className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Link2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
              <span>Access Mode:</span>
            </span>
            <span className="text-[var(--accent)] font-semibold">
              {roomMeta.requirePass !== false ? 'Pass Required' : 'Link Access'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Presence:</span>
            </span>
            <span className="text-[var(--text-primary)] font-semibold">{participantCount} here</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Encryption:</span>
            <span className="text-[var(--accent)] font-semibold">AES-256-GCM + AAD</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Lifecycle:</span>
            <span className="text-[var(--text-primary)] font-semibold">Dissolves upon exit</span>
          </div>
        </div>

        {/* Secondary Technical Inspector Link */}
        {latestPacket && (
          <div className="pt-2">
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
          </div>
        )}

        <div className="pt-3 border-t border-[var(--border)] flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} className="border-[var(--border)]">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
