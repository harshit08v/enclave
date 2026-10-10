'use client';

import React from 'react';
import { X, LogOut, Flame, ShieldAlert, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveConfirmationModalProps {
  onStay: () => void;
  onLeave: () => void;
  onDestroy: () => void;
  mode?: 'leave' | 'destroy';
  participantCount: number;
  isCreator?: boolean;
}

export default function LeaveConfirmationModal({
  onStay,
  onLeave,
  onDestroy,
  mode = 'leave',
  participantCount,
  isCreator = false
}: LeaveConfirmationModalProps) {
  const isFinal = participantCount <= 1;
  const isDestroyMode = mode === 'destroy' || isFinal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
        <div className="flex items-start justify-between">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
              isDestroyMode
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isDestroyMode ? (
              <>
                <Flame className="w-3 h-3 text-rose-500" />
                <span>Permanent Destruction</span>
              </>
            ) : (
              <>
                <DoorOpen className="w-3 h-3 text-amber-600" />
                <span>Departure</span>
              </>
            )}
          </div>
          <button
            onClick={onStay}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
            {isDestroyMode ? 'Leave & Destroy Room?' : 'Leave this Room?'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {isDestroyMode
              ? isFinal
                ? 'You are the only participant left. Leaving will permanently destroy this room and wipe all in-transit buffers. No one will be able to rejoin.'
                : 'This will immediately end the session for EVERYONE connected. All cryptographic keys, in-flight packets, and media buffers will be permanently zeroized.'
              : 'You will exit the room. The conversation will remain active for remaining participants.'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Active Participants:</span>
            <span className="text-[var(--text-primary)] font-semibold">{participantCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Session Effect:</span>
            <span className={isDestroyMode ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-[var(--text-primary)] font-semibold'}>
              {isDestroyMode ? 'GLOBAL DISSOLUTION' : 'INDIVIDUAL EXIT'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Local Key Zeroization:</span>
            <span className="text-[var(--accent)] font-semibold">IMMEDIATE ON EXIT</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onStay}
            className="flex-1 h-11 border-[var(--border)] order-2 sm:order-1"
          >
            Stay in Room
          </Button>

          {isDestroyMode ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onDestroy}
              className="flex-1 h-11 flex items-center justify-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white order-1 sm:order-2"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Destroy for Everyone</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={onLeave}
              className="flex-1 h-11 flex items-center justify-center space-x-1.5 order-1 sm:order-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Room</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
