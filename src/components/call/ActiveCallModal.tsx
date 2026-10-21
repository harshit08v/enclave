'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Minimize2,
  SwitchCamera,
  Volume2,
  Shield,
  Activity
} from 'lucide-react';
import { CallDetails } from '@/lib/webrtcManager';

interface ActiveCallModalProps {
  details: CallDetails;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onMinimize: () => void;
  onEndCall: () => void;
}

export default function ActiveCallModal({
  details,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onMinimize,
  onEndCall
}: ActiveCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [pipPosition, setPipPosition] = useState<'top-right' | 'bottom-right'>('top-right');

  const isVideo = details.callType === 'video';
  const isConnected = details.state === 'connected';
  const isReconnecting = details.state === 'reconnecting';

  // Format call duration MM:SS or HH:MM:SS
  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Attach local stream to preview element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, details.isVideoEnabled]);

  // Attach remote stream to remote video & audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Check if multiple camera devices exist (for front/back toggle)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden select-none">
      {/* Remote Audio output sink (always present to ensure audio plays) */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full h-full sm:max-w-4xl sm:h-[85vh] sm:rounded-3xl bg-[var(--surface)] border border-white/10 sm:shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* ========================================================= */}
        {/* TOP STATUS BAR                                            */}
        {/* ========================================================= */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between pointer-events-auto">
          {/* Left: Participant Name & Encryption Status */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-medium text-white tracking-tight drop-shadow-md">
                {details.remoteParticipant.displayName || 'Participant'}
              </h2>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white/90 backdrop-blur-md border border-white/10">
                <Shield className="w-3 h-3 text-[var(--accent)]" />
                <span>P2P ENCRYPTED</span>
              </div>
            </div>

            {/* Duration / Connection status */}
            <div className="flex items-center space-x-2 text-xs font-mono">
              {isReconnecting ? (
                <span className="text-amber-400 animate-pulse flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Reconnecting…
                </span>
              ) : isConnected ? (
                <span className="text-[var(--accent)] font-medium">
                  {formatDuration(details.durationSeconds)}
                </span>
              ) : (
                <span className="text-white/70">Connecting…</span>
              )}
            </div>
          </div>

          {/* Right: Minimize button */}
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize call window"
            title="Minimize call"
            className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* MAIN CALL CONTENT: VIDEO OR AUDIO WAVEFORM                */}
        {/* ========================================================= */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black/95 overflow-hidden">
          {isVideo ? (
            /* --- VIDEO MODE --- */
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover sm:object-contain bg-black"
              />

              {/* Local PiP Preview */}
              {localStream && details.isVideoEnabled ? (
                <div
                  onClick={() =>
                    setPipPosition(pipPosition === 'top-right' ? 'bottom-right' : 'top-right')
                  }
                  className={`absolute z-20 w-28 sm:w-44 aspect-3/4 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black transition-all cursor-pointer hover:border-white/40 ${
                    pipPosition === 'top-right'
                      ? 'top-20 right-4 sm:top-24 sm:right-6'
                      : 'bottom-28 right-4 sm:bottom-32 sm:right-6'
                  }`}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <div className="absolute bottom-1 right-2 text-[10px] font-mono text-white/80 bg-black/50 px-1.5 py-0.5 rounded-md">
                    You
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            /* --- VOICE MODE (Calm, Audio-first Canvas) --- */
            <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
              <div className="relative flex items-center justify-center">
                <div className="w-36 h-36 rounded-full bg-[var(--accent)]/10 animate-pulse border border-[var(--accent)]/20" />
                <div className="absolute w-28 h-28 rounded-full bg-[var(--accent)]/20 animate-ping opacity-40" />
                <div className="absolute w-24 h-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-2xl">
                  <Volume2 className="w-12 h-12" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-normal text-white tracking-tight">
                  {details.remoteParticipant.displayName || 'Participant'}
                </h3>
                <p className="text-xs font-mono text-white/60">
                  {isConnected ? 'Voice Call Active' : 'Establishing Secure Direct Channel…'}
                </p>
              </div>

              <div className="px-4 py-1.5 rounded-full bg-white/10 text-white font-mono text-sm tracking-wider">
                {formatDuration(details.durationSeconds)}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* BOTTOM ACTION CONTROLS DOCK                               */}
        {/* ========================================================= */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center pointer-events-auto">
          <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/15 shadow-2xl">
            {/* Microphone Mute Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={details.isMuted ? 'Unmute microphone' : 'Mute microphone'}
              title={details.isMuted ? 'Unmute' : 'Mute'}
              className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer active:scale-95 ${
                details.isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-white/15 hover:bg-white/25 text-white'
              }`}
            >
              {details.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Camera Toggle (Video Call only) */}
            {isVideo && (
              <button
                type="button"
                onClick={onToggleVideo}
                aria-label={details.isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
                title={details.isVideoEnabled ? 'Stop Video' : 'Start Video'}
                className={`p-3 sm:p-3.5 rounded-full transition-all cursor-pointer active:scale-95 ${
                  !details.isVideoEnabled
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {!details.isVideoEnabled ? (
                  <VideoOff className="w-5 h-5" />
                ) : (
                  <VideoIcon className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Switch Camera Button (Mobile / Multi-camera only) */}
            {isVideo && hasMultipleCameras && (
              <button
                type="button"
                onClick={onSwitchCamera}
                aria-label="Switch camera"
                title="Switch Camera"
                className="p-3 sm:p-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer active:scale-95"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            {/* End Call Button (Prominent Red) */}
            <button
              type="button"
              onClick={onEndCall}
              aria-label="End call"
              title="End Call"
              className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center space-x-2 shadow-lg transition-all cursor-pointer active:scale-95 ml-1"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
