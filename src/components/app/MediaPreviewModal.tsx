'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, ArrowUp, AlertCircle, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/mediaConfig';

interface MediaPreviewModalProps {
  file: File;
  onSend: (caption: string, viewOnce?: boolean) => Promise<void>;
  onClose: () => void;
  isSending: boolean;
}

export default function MediaPreviewModal({
  file,
  onSend,
  onClose,
  isSending
}: MediaPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [viewOnce, setViewOnce] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isVideo = file.type.startsWith('video/');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    setError(null);
    try {
      await onSend(caption, viewOnce);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to encrypt and send media');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-lg w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
              {isVideo ? <Film className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] tracking-tight">
                Send Encrypted {isVideo ? 'Video' : 'Photo'}
              </h3>
              <div className="text-[11px] font-mono text-[var(--text-muted)]">
                {file.name} · {formatFileSize(file.size)}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Preview Viewport */}
        <div className="p-4 bg-[var(--background)] flex items-center justify-center overflow-hidden max-h-[45vh] border-b border-[var(--border)]">
          {previewUrl && (
            isVideo ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="max-h-[40vh] max-w-full rounded-lg border border-[var(--border)] shadow-xs object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-[40vh] max-w-full rounded-lg border border-[var(--border)] shadow-xs object-contain"
              />
            )
          )}
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-xs font-mono text-rose-700 dark:text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                Add Caption <span className="text-[var(--text-muted)] lowercase">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setViewOnce(!viewOnce)}
                title={viewOnce ? 'View once is enabled: Media can only be opened once' : 'Enable view once'}
                className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer ${
                  viewOnce
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
                    : 'bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                <span className="font-bold">①</span>
                <span>{viewOnce ? 'View-once active' : 'View once'}</span>
              </button>
            </div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a message alongside this media..."
              disabled={isSending}
              className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
            {viewOnce && (
              <p className="mt-1 text-[11px] font-mono text-amber-500">
                Recipient can open this photo/video once. It is permanently purged from storage upon viewing.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[var(--accent)]">
              <Lock className="w-3 h-3" />
              <span>AES-256-GCM encrypted before upload</span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSending}
                className="h-9 px-3 text-xs border-[var(--border)]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSending}
                className="h-9 px-4 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
              >
                {isSending ? (
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>Encrypting...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1.5">
                    <span>Send</span>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
