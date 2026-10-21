'use client';

import React, { useEffect } from 'react';
import { X, Lock, Download } from 'lucide-react';

interface MediaLightboxModalProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  fileName?: string;
  senderName: string;
  timestamp: number;
  onClose: () => void;
  isViewOnce?: boolean;
}

export default function MediaLightboxModal({
  mediaUrl,
  mediaType,
  fileName,
  senderName,
  timestamp,
  onClose,
  isViewOnce = false
}: MediaLightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between text-white/90 z-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          {isViewOnce ? (
            <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
              <span className="font-bold">①</span>
              <span>View-Once Media · Deletes on close</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs font-mono text-[#E7F0EC] bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Decrypted in memory</span>
            </div>
          )}
          <div className="text-xs font-mono text-white/60">
            <span>{senderName}</span> · <span>{formattedTime}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {mediaUrl && !isViewOnce && (
            <a
              href={mediaUrl}
              download={fileName || `enclave-media-${timestamp}`}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Save file"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Media Viewport */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain"
          />
        ) : (
          <img
            src={mediaUrl}
            alt={fileName || 'Decrypted media'}
            className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain select-none"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs font-mono text-white/40 pb-2">
        Zero persistent storage · In-memory temporary buffer
      </div>
    </div>
  );
}
