'use client';

import React, { useState } from 'react';
import { X, Volume2, Bell, Vibrate, Play, Square, Settings2 } from 'lucide-react';
import { getCallAudioManager, CallSoundPreferences } from '@/lib/callAudioManager';

interface CallSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CallSettingsModal({
  isOpen,
  onClose
}: CallSettingsModalProps) {
  const audioMgr = getCallAudioManager();
  const [prefs, setPrefs] = useState<CallSoundPreferences>(audioMgr.getPreferences());
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  if (!isOpen) return null;

  const handleToggleRingtone = () => {
    const updated = { ...prefs, ringtoneEnabled: !prefs.ringtoneEnabled };
    setPrefs(updated);
    audioMgr.updatePreferences(updated);
  };

  const handleToggleRingback = () => {
    const updated = { ...prefs, ringbackEnabled: !prefs.ringbackEnabled };
    setPrefs(updated);
    audioMgr.updatePreferences(updated);
  };

  const handleToggleVibration = () => {
    const updated = { ...prefs, vibrationEnabled: !prefs.vibrationEnabled };
    setPrefs(updated);
    audioMgr.updatePreferences(updated);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    const updated = { ...prefs, volume: vol };
    setPrefs(updated);
    audioMgr.updatePreferences(updated);
  };

  const handlePreviewToggle = () => {
    if (isPlayingPreview) {
      audioMgr.stopAll();
      setIsPlayingPreview(false);
    } else {
      setIsPlayingPreview(true);
      audioMgr.previewRingtone();
      setTimeout(() => setIsPlayingPreview(false), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-[var(--surface-muted)] text-[var(--accent)] border border-[var(--border)]">
              <Settings2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-medium text-[var(--text-primary)] tracking-tight">
              Call Audio Settings
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              audioMgr.stopAll();
              onClose();
            }}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs font-mono">
          {/* Ringtone Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="flex items-center space-x-2.5">
              <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Incoming Ringtone</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.ringtoneEnabled}
              onChange={handleToggleRingtone}
              className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Ringback Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="flex items-center space-x-2.5">
              <Volume2 className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Outgoing Ringback</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.ringbackEnabled}
              onChange={handleToggleRingback}
              className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div className="flex items-center space-x-2.5">
              <Vibrate className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>Haptic Vibration</span>
            </div>
            <input
              type="checkbox"
              checked={prefs.vibrationEnabled}
              onChange={handleToggleVibration}
              className="accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Volume Slider */}
          <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span>Volume</span>
              <span className="text-[var(--accent)] font-semibold">
                {Math.round(prefs.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={prefs.volume}
              onChange={handleVolumeChange}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </div>

          {/* Test Ringtone Preview Button */}
          <button
            type="button"
            onClick={handlePreviewToggle}
            className="w-full py-2.5 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent-hover)]/20 text-[var(--accent)] border border-[var(--accent-border)] font-mono text-xs flex items-center justify-center space-x-2 cursor-pointer transition-colors"
          >
            {isPlayingPreview ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Ringtone</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[10px] font-mono text-[var(--text-muted)]">
          Zero external audio downloads · Synthesized locally in-browser
        </div>
      </div>
    </div>
  );
}
