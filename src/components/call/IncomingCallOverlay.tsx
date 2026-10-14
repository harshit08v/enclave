'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneOff, Volume2, Shield } from 'lucide-react';
import { CallDetails } from '@/lib/webrtcManager';
import { getCallAudioManager } from '@/lib/callAudioManager';

interface IncomingCallOverlayProps {
  details: CallDetails;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallOverlay({
  details,
  onAccept,
  onDecline
}: IncomingCallOverlayProps) {
  const [isAudioBlocked, setIsAudioBlocked] = useState(() =>
    typeof window !== 'undefined' ? getCallAudioManager().isAutoplayBlocked() : false
  );

  useEffect(() => {
    const audioMgr = getCallAudioManager();
    const checkInterval = setInterval(() => {
      setIsAudioBlocked(audioMgr.isAutoplayBlocked());
    }, 1000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleEnableAudio = async () => {
    const audioMgr = getCallAudioManager();
    await audioMgr.unlockAudio();
    audioMgr.playIncomingRingtone();
    setIsAudioBlocked(false);
  };

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

        {/* Animated Caller Avatar / Pulsing Icon */}
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

        {/* Caller Identity */}
        <div className="space-y-1">
          <h3 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
            {details.remoteParticipant.displayName || 'Participant'}
          </h3>
          <p className="text-xs font-mono text-[var(--text-secondary)]">
            Incoming {isVideo ? 'video' : 'voice'} call…
          </p>
        </div>

        {/* Browser Autoplay Prompt if Sound Blocked */}
        {isAudioBlocked && (
          <button
            type="button"
            onClick={handleEnableAudio}
            className="w-full py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-mono flex items-center justify-center space-x-2 cursor-pointer hover:bg-amber-500/20 transition-colors"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span>Click to enable ringtone</span>
          </button>
        )}

        {/* Action Buttons: Decline (Rose) & Accept (Forest Green) */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Decline Button */}
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-98"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          {/* Accept Button */}
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            className="flex-1 py-3 px-4 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer active:scale-98"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
