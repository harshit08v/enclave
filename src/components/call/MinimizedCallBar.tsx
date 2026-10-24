'use client';

import React, { useRef, useEffect } from 'react';
import { Phone, Video, Mic, MicOff, Maximize2, PhoneOff, User } from 'lucide-react';
import { CallDetails } from '@/lib/webrtcManager';

interface MinimizedCallBarProps {
  details: CallDetails;
  remoteStream?: MediaStream | null;
  onMaximize: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export default function MinimizedCallBar({
  details,
  remoteStream,
  onMaximize,
  onToggleMute,
  onEndCall
}: MinimizedCallBarProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const isVideo = details.callType === 'video';
  const remoteCameraOn = details.remoteVideoEnabled !== false;

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keep remote media playing while minimized in chat
  useEffect(() => {
    if (isVideo && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (!isVideo && remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, isVideo]);

  return (
    <aside
      aria-label="Active call picture-in-picture"
      className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom-4 duration-200 select-none"
    >
      {/* Audio sink for voice calls */}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {isVideo ? (
        /* ========================================================= */
        /* SIGNAL-STYLE FLOATING VIDEO PICTURE-IN-PICTURE (PIP)     */
        /* ========================================================= */
        <div className="relative w-36 sm:w-48 aspect-3/4 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black group transition-all">
          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            onClick={onMaximize}
            className={`w-full h-full object-cover cursor-pointer ${
              remoteCameraOn ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Placeholder if remote camera is off */}
          {!remoteCameraOn && (
            <div
              onClick={onMaximize}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 cursor-pointer p-2 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 mb-1">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-white/70 font-mono">Camera off</span>
            </div>
          )}

          {/* Top Info Bar */}
          <div
            onClick={onMaximize}
            className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between cursor-pointer"
          >
            <span className="text-[11px] font-medium text-white truncate max-w-[90px]">
              {details.remoteParticipant.displayName || 'Call'}
            </span>
            <span className="text-[10px] font-mono text-[var(--accent)] font-semibold">
              {formatDuration(details.durationSeconds)}
            </span>
          </div>

          {/* Floating Controls Overlay (Visible on hover or tap) */}
          <div className="absolute bottom-0 inset-x-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Quick Mute Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute();
              }}
              aria-label={details.isMuted ? 'Unmute microphone' : 'Mute microphone'}
              title={details.isMuted ? 'Unmute' : 'Mute'}
              className={`p-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                details.isMuted
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {details.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Expand / Maximize Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              aria-label="Expand call full screen"
              title="Expand Call"
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEndCall();
              }}
              aria-label="End call"
              title="End Call"
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow transition-colors cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VOICE CALL FLOATING BAR                                   */
        /* ========================================================= */
        <div className="flex items-center gap-2 sm:gap-3 p-2 pl-3.5 bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xl font-mono text-xs text-[var(--text-primary)]">
          {/* Pulsing Audio Icon */}
          <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
            <Phone className="w-3.5 h-3.5" />
          </div>

          {/* Participant & Duration */}
          <div className="flex flex-col text-left pr-2 cursor-pointer" onClick={onMaximize}>
            <span className="font-semibold text-xs tracking-tight truncate max-w-[120px]">
              {details.remoteParticipant.displayName || 'Voice Call'}
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
                ? 'bg-rose-500 text-white'
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
      )}
    </aside>
  );
}
