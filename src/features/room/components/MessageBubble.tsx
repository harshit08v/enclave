'use client';

import React from 'react';
import {
  Check,
  CheckCheck,
  Flame,
  Eye,
  Lock,
  Loader2,
  FileText,
  Play,
  Reply
} from 'lucide-react';
import { DecryptedMessage } from '@/packages/protocol';

export interface MessageBubbleProps {
  message: DecryptedMessage;
  isSelf: boolean;
  onOpenMedia?: (msg: DecryptedMessage) => void;
  onOpenViewOnce?: (msg: DecryptedMessage) => void;
  onReply?: (msg: DecryptedMessage) => void;
  openingMediaId?: string | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  onOpenMedia,
  onOpenViewOnce,
  onReply,
  openingMediaId
}) => {
  const isOpening = openingMediaId === message.id;
  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`group flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] select-text`}
    >
      {/* Sender Header for Incoming Messages */}
      {!isSelf && (
        <span className="text-[11px] font-mono text-[var(--text-muted)] mb-1 px-1 font-medium">
          {message.senderName || 'Anonymous Guest'}
        </span>
      )}

      {/* Reply Quote Banner */}
      {message.replyTo && (
        <div
          className={`text-xs px-3 py-1.5 mb-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] flex items-center space-x-1.5 opacity-80 ${
            isSelf ? 'rounded-br-xs' : 'rounded-bl-xs'
          }`}
        >
          <Reply className="w-3 h-3 text-[var(--brass)] shrink-0" />
          <span className="font-semibold text-[11px] font-mono">{message.replyTo.senderName}:</span>
          <span className="truncate max-w-[200px] text-[11px]">{message.replyTo.snippet}</span>
        </div>
      )}

      {/* Main Message Bubble */}
      <div
        className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all shadow-2xs ${
          isSelf
            ? 'bg-[var(--accent)] text-white rounded-tr-xs'
            : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-xs'
        }`}
      >
        {/* Media Attachment */}
        {message.mediaMeta && (
          <div className="mb-2">
            {message.mediaMeta.viewOnce ? (
              // View-Once Encrypted Media
              <div className="p-3 rounded-xl border border-dashed border-[var(--brass)] bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[var(--brass)]/10 text-[var(--brass)]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-mono font-semibold">View-Once Media</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {message.mediaMeta.viewedAt ? 'Permanently erased' : 'Volatile blind payload'}
                    </div>
                  </div>
                </div>

                {!message.mediaMeta.viewedAt && (
                  <button
                    onClick={() => onOpenViewOnce?.(message)}
                    disabled={isOpening}
                    className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-mono font-semibold flex items-center space-x-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isOpening ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    <span>{isOpening ? 'Decrypting...' : 'View'}</span>
                  </button>
                )}
              </div>
            ) : (
              // Standard Encrypted Media (Image / Video)
              <div
                onClick={() => onOpenMedia?.(message)}
                className="cursor-pointer rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-sm hover:opacity-95 transition-opacity relative group/media"
              >
                {message.mediaMeta.mediaType === 'image' && message.mediaMeta.localBlobUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.mediaMeta.localBlobUrl}
                    alt={message.mediaMeta.fileName || 'Encrypted Attachment'}
                    className="w-full max-h-72 object-cover rounded-xl"
                  />
                )}

                {message.mediaMeta.mediaType === 'video' && message.mediaMeta.localBlobUrl && (
                  <div className="relative">
                    <video
                      src={message.mediaMeta.localBlobUrl}
                      className="w-full max-h-72 object-cover rounded-xl"
                      controls={false}
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white">
                        <Play className="w-6 h-6 fill-white" />
                      </div>
                    </div>
                  </div>
                )}

                {!message.mediaMeta.localBlobUrl && (
                  <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 flex items-center space-x-2 text-xs font-mono">
                    <FileText className="w-4 h-4 text-[var(--brass)]" />
                    <span className="truncate">{message.mediaMeta.fileName || 'Encrypted attachment'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text Content */}
        {message.text && (
          <p className="whitespace-pre-wrap break-words text-sm font-normal selection:bg-white/30 selection:text-white">
            {message.text}
          </p>
        )}

        {/* Footer Meta (Timestamp, Disappearing Timer, Delivery Checks) */}
        <div
          className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] font-mono ${
            isSelf ? 'text-white/75' : 'text-[var(--text-muted)]'
          }`}
        >
          {/* Disappearing indicator */}
          {message.expiresAt && (
            <span className="flex items-center space-x-0.5 text-amber-300 dark:text-amber-400 font-semibold" title="Disappearing message">
              <Flame className="w-3 h-3" />
            </span>
          )}

          <span>{timeStr}</span>

          {isSelf && (
            <span>
              <CheckCheck className="w-3.5 h-3.5 inline ml-0.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
