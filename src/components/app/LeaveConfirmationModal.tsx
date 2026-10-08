'use client';

import React from 'react';
import { X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaveConfirmationModalProps {
  onStay: () => void;
  onLeaveAndDestroy: () => void;
  participantCount: number;
}

export default function LeaveConfirmationModal({
  onStay,
  onLeaveAndDestroy,
  participantCount,
}: LeaveConfirmationModalProps) {
  const isFinal = participantCount <= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
        <div className="flex items-start justify-between">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] dark:bg-amber-950/60 dark:border-amber-900 text-[10px] font-mono text-[#92400E] dark:text-amber-300 font-medium">
            <span>Departure</span>
          </div>
          <button
            onClick={onStay}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-md hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
            Leave this room?
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {isFinal
              ? 'You are the final participant. Leaving will permanently destroy this room and all in-transit memory buffers.'
              : 'Leaving may end the conversation for everyone still inside.'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Active Participants:</span>
            <span className="text-[var(--text-primary)] font-semibold">{participantCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Memory Key Zeroization:</span>
            <span className="text-[var(--accent)] font-semibold">IMMEDIATE ON EXIT</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onStay}
            className="flex-1 h-11 border-[var(--border)]"
          >
            Stay
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onLeaveAndDestroy}
            className="flex-1 h-11 flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave room</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
