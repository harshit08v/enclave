'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ShieldCheck, Lock, ArrowDown } from 'lucide-react';
import { DecryptedMessage } from '@/packages/protocol';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: DecryptedMessage[];
  systemNotices: { id: string; text: string; timestamp: number }[];
  currentUserId: string;
  onOpenMedia?: (msg: DecryptedMessage) => void;
  onOpenViewOnce?: (msg: DecryptedMessage) => void;
  onReply?: (msg: DecryptedMessage) => void;
  openingMediaId?: string | null;
  onOpenSafety?: () => void;
  isVerified?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  systemNotices,
  currentUserId,
  onOpenMedia,
  onOpenViewOnce,
  onReply,
  openingMediaId,
  onOpenSafety,
  isVerified
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isAtBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, systemNotices.length]);

  const isEmpty = messages.length === 0 && systemNotices.length === 0;

  return (
    <div className="relative flex-1 overflow-hidden bg-[var(--background)]">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 sm:px-6 py-6 space-y-4"
      >
        {/* Editorial Privacy Introduction Card */}
        <div className="max-w-md mx-auto my-4 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-3.5 shadow-2xs">
          <div className="inline-flex p-2.5 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
            <Lock className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif italic text-lg sm:text-xl font-normal text-[var(--text-primary)]">
              End-to-End Encrypted Chamber
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Messages and media exist strictly in volatile device RAM and dissolve the instant all participants exit. Zero persistent logs or keys are retained on any server.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-center space-x-3 text-[11px] font-mono text-[var(--text-muted)]">
            <span>AES-256-GCM</span>
            <span>·</span>
            <span>Argon2id</span>
            <span>·</span>
            <button
              onClick={onOpenSafety}
              className="text-[var(--brass)] hover:underline font-semibold"
            >
              {isVerified ? 'Verified Keys' : 'Verify Keys'}
            </button>
          </div>
        </div>

        {/* System Notices */}
        {systemNotices.map((notice) => (
          <div key={notice.id} className="flex justify-center my-2">
            <div className="px-3 py-1 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] text-center">
              {notice.text}
            </div>
          </div>
        ))}

        {/* Message Items */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <MessageBubble
              message={msg}
              isSelf={msg.senderId === currentUserId}
              onOpenMedia={onOpenMedia}
              onOpenViewOnce={onOpenViewOnce}
              onReply={onReply}
              openingMediaId={openingMediaId}
            />
          </div>
        ))}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 p-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-transform hover:scale-105 cursor-pointer focus:outline-none"
          title="Scroll to latest messages"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default MessageList;
