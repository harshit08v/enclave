'use client';

import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Check, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccessibleModal } from '@/lib/useAccessibleModal';

interface IdentityAlertModalProps {
  isOpen: boolean;
  senderId: string;
  senderName: string;
  oldKey: string;
  newKey: string;
  safetyNumber?: string | null;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function IdentityAlertModal({
  isOpen,
  senderId,
  senderName,
  oldKey,
  newKey,
  safetyNumber,
  onAccept,
  onReject,
  onClose
}: IdentityAlertModalProps) {
  const [copied, setCopied] = useState(false);
  const { modalRef, handleBackdropClick } = useAccessibleModal(isOpen, onClose);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs selection:bg-rose-500/20 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="identity-alert-title"
        aria-describedby="identity-alert-desc"
        className="bg-[var(--surface)] border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          aria-label="Close security alert"
          className="absolute top-5 right-5 text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Cryptographic Identity Changed</span>
            </div>
            <h2 id="identity-alert-title" className="text-xl font-serif font-bold text-[var(--foreground)] tracking-tight">
              Safety Number Mismatch for {senderName}
            </h2>
          </div>
        </div>

        <p id="identity-alert-desc" className="text-sm text-[var(--muted)] leading-relaxed">
          The cryptographic device key used to authenticate messages from <strong className="text-[var(--foreground)]">{senderName}</strong> has changed. This typically happens if they switched devices, reinstalled their browser, or cleared their keys. However, it can also indicate a man-in-the-middle attack.
        </p>

        <div className="p-4 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] space-y-3 font-mono text-xs">
          <div>
            <span className="text-[var(--muted)] block text-[10px] uppercase tracking-wider mb-0.5">Prior Verified Key:</span>
            <div className="flex items-center justify-between text-[var(--foreground)] break-all bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)]">
              <span>{oldKey.slice(0, 16)}...{oldKey.slice(-16)}</span>
              <button
                type="button"
                onClick={() => handleCopy(oldKey)}
                aria-label="Copy prior key"
                className="text-[var(--muted)] hover:text-[var(--foreground)] ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-rose-500 block text-[10px] uppercase tracking-wider mb-0.5 font-bold">New Unverified Replacement Key:</span>
            <div className="flex items-center justify-between text-[var(--foreground)] break-all bg-[var(--surface)] p-2 rounded-lg border border-rose-500/30">
              <span>{newKey.slice(0, 16)}...{newKey.slice(-16)}</span>
              <button
                type="button"
                onClick={() => handleCopy(newKey)}
                aria-label="Copy new key"
                className="text-[var(--muted)] hover:text-[var(--foreground)] ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {safetyNumber && (
            <div>
              <span className="text-[var(--muted)] block text-[10px] uppercase tracking-wider mb-0.5">New Safety Number Fingerprint:</span>
              <p className="p-2 rounded-lg bg-[var(--surface)] text-[var(--foreground)] font-bold tracking-wider text-center border border-[var(--border)]">
                {safetyNumber}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          Messages from this participant are currently <strong>quarantined and blocked from display</strong>. You must explicitly verify their identity to resume communications.
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onReject}
            className="w-full sm:w-auto text-rose-600 hover:text-rose-700 border-rose-500/30 hover:bg-rose-500/10"
          >
            Reject & Block Key
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            className="w-full sm:w-auto bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-medium"
          >
            Verify & Accept New Key
          </Button>
        </div>
      </div>
    </div>
  );
}
