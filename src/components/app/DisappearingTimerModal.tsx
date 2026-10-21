'use client';

import React from 'react';
import { X, Clock, Flame, ShieldAlert, Check } from 'lucide-react';

interface DisappearingTimerModalProps {
  isOpen: boolean;
  currentTimerSec: number;
  onClose: () => void;
  onSetTimer: (seconds: number) => void;
}

const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0, desc: 'Messages do not automatically expire' },
  { label: '30 seconds', seconds: 30, desc: 'Ephemeral test / immediate burn' },
  { label: '5 minutes', seconds: 300, desc: 'Short-lived confidential exchanges' },
  { label: '1 hour', seconds: 3600, desc: 'Standard private session duration' },
  { label: '24 hours', seconds: 86400, desc: 'Day-long ephemeral conversation' },
];

export default function DisappearingTimerModal({
  isOpen,
  currentTimerSec,
  onClose,
  onSetTimer
}: DisappearingTimerModalProps) {
  if (!isOpen) return null;

  const handleSelect = (sec: number) => {
    onSetTimer(sec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Disappearing Messages</h3>
              <p className="text-[11px] font-mono text-[var(--text-secondary)]">Automated cryptographic message burn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-2">
          {TIMER_OPTIONS.map((opt) => {
            const isSelected = currentTimerSec === opt.seconds;
            return (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => handleSelect(opt.seconds)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--accent-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold font-mono flex items-center space-x-2">
                    <span>{opt.label}</span>
                    {opt.seconds > 0 && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{opt.desc}</div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Security / Honesty Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
          <div className="flex items-center space-x-1.5 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Cryptographic & Server Deletion Guarantee</span>
          </div>
          <p className="leading-relaxed text-[10px] font-mono opacity-90">
            Messages disappear from local displays and are pruned from server relay storage once their timer expires. Note: No software can physically block recipients from capturing screenshots or filming the display screen.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
