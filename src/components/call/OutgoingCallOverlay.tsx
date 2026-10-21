'use client';

import React from 'react';
import { Phone, Video, PhoneOff, Shield } from 'lucide-react';
import { CallDetails } from '@/lib/webrtcManager';

interface OutgoingCallOverlayProps {
  details: CallDetails;
  onCancel: () => void;
}

export default function OutgoingCallOverlay({
  details,
  onCancel
}: OutgoingCallOverlayProps) {
  const isVideo = details.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-sm w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-center">
        {/* Top Encrypted Security Tag */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
            <Shield className="w-3.5 h-3.5" />
            <span>ENCRYPTED {isVideo ? 'VIDEO' : 'VOICE'} CALL</span>
          </div>
        </div>

        {/* Animated Avatar / Ripple Pulse */}
        <div className="relative flex items-center justify-center py-2">
          <div className="absolute w-24 h-24 rounded-full bg-[var(--accent)]/15 animate-ping" />
          <div className="absolute w-20 h-20 rounded-full bg-[var(--accent)]/20 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg">
            {isVideo ? (
              <Video className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Caller Identity & Ringing Status */}
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
            {details.remoteParticipant.displayName || 'Participant'}
          </h3>
          <p className="text-xs font-mono text-[var(--accent)] animate-pulse">
            Calling… waiting for answer
          </p>
        </div>

        {/* Cancel Button */}
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel call"
            className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer active:scale-98"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Cancel Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
