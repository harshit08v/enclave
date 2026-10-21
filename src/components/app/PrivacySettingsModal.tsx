'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Eye, EyeOff, MessageSquare, CheckCheck, Bell } from 'lucide-react';
import {
  getPrivacyPreferences,
  setPrivacyPreferences,
  PrivacyPreferences
} from '@/lib/privacyPreferences';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacySettingsModal({
  isOpen,
  onClose
}: PrivacySettingsModalProps) {
  const [prefs, setPrefs] = useState<PrivacyPreferences>(getPrivacyPreferences());

  useEffect(() => {
    if (isOpen) {
      setPrefs(getPrivacyPreferences());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PrivacyPreferences) => {
    const updated = setPrivacyPreferences({ [key]: !prefs[key] });
    setPrefs(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Privacy Controls</h3>
              <p className="text-[11px] font-mono text-[var(--text-secondary)]">Client-side security & telemetry controls</p>
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

        {/* Toggles */}
        <div className="space-y-4">
          {/* 1. Read Receipts */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center space-x-2">
                <CheckCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Read Receipts</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Send and receive read receipts (double green checks). If disabled, your contacts will only see delivered status.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.readReceipts}
              onClick={() => handleToggle('readReceipts')}
              className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                prefs.readReceipts ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  prefs.readReceipts ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 2. Typing Indicators */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Typing Indicators</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Transmit live typing status when composing messages. If disabled, contacts cannot tell when you are typing.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.typingIndicators}
              onClick={() => handleToggle('typingIndicators')}
              className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                prefs.typingIndicators ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  prefs.typingIndicators ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* 3. Notification Previews */}
          <div className="flex items-start justify-between p-3.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="space-y-1 pr-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">Notification Previews</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Show message text and sender name in OS notifications. Keep <span className="font-semibold text-[var(--text-primary)]">OFF</span> (recommended) to prevent leaking plaintext on lock screens.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notificationPreviews}
              onClick={() => handleToggle('notificationPreviews')}
              className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                prefs.notificationPreviews ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  prefs.notificationPreviews ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
