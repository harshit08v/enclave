'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Plus, Flame, X, Reply } from 'lucide-react';
import { MessageReplyMeta } from '@/packages/protocol';

export interface ChatInputBarProps {
  inputText: string;
  setInputText: (val: string) => void;
  onSendMessage: () => void;
  isSending: boolean;
  onOpenAttachment: () => void;
  onOpenPrivacy: () => void;
  disappearingTimer: number | null;
  replyingTo: MessageReplyMeta | null;
  onCancelReply: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputText,
  setInputText,
  onSendMessage,
  isSending,
  onOpenAttachment,
  onOpenPrivacy,
  disappearingTimer,
  replyingTo,
  onCancelReply
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    if (inputText === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputText]);

  const canSend = inputText.trim().length > 0 && !isSending;

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 select-none shrink-0 transition-colors">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Reply Quote Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-mono">
            <div className="flex items-center space-x-2 min-w-0">
              <Reply className="w-3.5 h-3.5 text-[var(--brass)] shrink-0" />
              <span className="font-semibold text-[var(--text-primary)] shrink-0">
                {replyingTo.senderName}:
              </span>
              <span className="truncate text-[var(--text-secondary)]">{replyingTo.snippet}</span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Input Control Bar */}
        <div className="flex items-end space-x-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-1.5 focus-within:border-[var(--accent)] transition-colors">
          {/* Attachment Button */}
          <button
            type="button"
            onClick={onOpenAttachment}
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer focus:outline-none"
            title="Attach Encrypted Photo or Video"
            aria-label="Attach File"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Ephemeral Timer Toggle Button */}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer focus:outline-none ${
              disappearingTimer && disappearingTimer > 0
                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
            }`}
            title="Disappearing Messages Timer"
            aria-label="Disappearing Messages"
          >
            <Flame className="w-5 h-5" />
          </button>

          {/* Auto-expanding Input Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type encrypted message..."
            className="flex-1 py-2 px-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none max-h-32 leading-relaxed"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={onSendMessage}
            disabled={!canSend}
            className={`p-2.5 rounded-xl font-semibold transition-all focus:outline-none ${
              canSend
                ? 'bg-[var(--accent)] text-white hover:opacity-90 shadow-2xs cursor-pointer'
                : 'bg-[var(--surface)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
            }`}
            title="Send Message"
            aria-label="Send"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default ChatInputBar;
