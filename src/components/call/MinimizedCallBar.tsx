'use client';

import React from 'react';
import { Phone, Video, Mic, MicOff, Maximize2, PhoneOff } from 'lucide-react';
import { CallDetails } from '@/lib/webrtcManager';

interface MinimizedCallBarProps {
  details: CallDetails;
  onMaximize: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export default function MinimizedCallBar({
  details,
  onMaximize,
  onToggleMute,
  onEndCall
}: MinimizedCallBarProps) {
  const isVideo = details.callType === 'video';

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <aside
      aria-label="Active call controls"
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-center gap-2 sm:gap-3 p-2 pl-3.5 bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl font-mono text-xs text-[var(--text-primary)]">
        {/* Pulsing Call Type Icon */}
        <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
        </div>

        {/* Participant & Duration */}
        <div className="flex flex-col text-left pr-2">
          <span className="font-semibold text-xs tracking-tight truncate max-w-[120px]">
            {details.remoteParticipant.displayName || 'Call'}
          </span>
          <span className="text-[11px] text-[var(--accent)]">
            {details.state === 'connected'
              ? formatDuration(details.durationSeconds)
              : details.state === 'reconnecting'
              ? 'Reconnecting…'
              : 'Connecting…'}
          </span>
        </div>

        {/* Quick Mute Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={details.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={details.isMuted ? 'Unmute' : 'Mute'}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            details.isMuted
              ? 'bg-rose-500/15 text-rose-500'
              : 'hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'
          }`}
        >
          {details.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Reopen / Expand Call Window */}
        <button
          type="button"
          onClick={onMaximize}
          aria-label="Expand call screen"
          title="Expand Call"
          className="p-2 rounded-xl hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Quick Hangup Button */}
        <button
          type="button"
          onClick={onEndCall}
          aria-label="End active call"
          title="End Call"
          className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
