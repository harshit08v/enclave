'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Copy, Check, QrCode } from 'lucide-react';
import {
  deriveSafetyFingerprint,
  formatVerificationQrPayload,
  getStoredVerification,
  storeVerifiedIdentity,
  clearStoredVerification
} from '@/lib/safetyFingerprint';

interface SafetyNumberModalProps {
  isOpen: boolean;
  roomId: string;
  roomMasterSecret: Uint8Array | null;
  participantIds: string[];
  onClose: () => void;
}

export default function SafetyNumberModal({
  isOpen,
  roomId,
  roomMasterSecret,
  participantIds,
  onClose
}: SafetyNumberModalProps) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasMismatch, setHasMismatch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !roomMasterSecret) return;

    let active = true;
    setLoading(true);

    deriveSafetyFingerprint(roomMasterSecret, roomId, participantIds)
      .then((fp) => {
        if (!active) return;
        setFingerprint(fp);

        const stored = getStoredVerification(roomId);
        if (stored) {
          if (stored.fingerprint === fp && stored.isVerified) {
            setIsVerified(true);
            setHasMismatch(false);
          } else if (stored.fingerprint !== fp) {
            // Cryptographic Key Mismatch Detected!
            setIsVerified(false);
            setHasMismatch(true);
          }
        } else {
          setIsVerified(false);
          setHasMismatch(false);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, roomId, roomMasterSecret, participantIds]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!fingerprint) return;
    navigator.clipboard.writeText(fingerprint).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVerified = () => {
    if (!fingerprint) return;
    if (isVerified) {
      clearStoredVerification(roomId);
      setIsVerified(false);
    } else {
      storeVerifiedIdentity(roomId, fingerprint);
      setIsVerified(true);
      setHasMismatch(false);
    }
  };

  const blocks = fingerprint ? fingerprint.split(' ') : [];
  const qrPayload = fingerprint ? formatVerificationQrPayload(roomId, fingerprint) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${
              hasMismatch
                ? 'bg-rose-500/10 text-rose-500'
                : isVerified
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
            }`}>
              {hasMismatch ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Contact Safety Number</h3>
              <p className="text-[11px] font-mono text-[var(--text-secondary)]">Deterministic End-to-End Key Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning if Key Mismatch */}
        {hasMismatch && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-mono space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>SAFETY NUMBER MISMATCH DETECTED</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              The cryptographic room keys or participant identities have changed since you last marked this contact as verified. Re-verify the numbers before sharing sensitive information.
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Compare this 60-digit safety number with your contact out-of-band (or scan the verification code) to verify that no third party or man-in-the-middle is intercepting your conversation.
        </p>

        {/* 60-Digit Fingerprint Blocks */}
        {loading ? (
          <div className="p-6 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
            DERIVING CRYPTOGRAPHIC SAFETY NUMBER...
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center font-mono text-xs font-semibold text-[var(--text-primary)] tracking-wider">
              {blocks.map((block, i) => (
                <div key={i} className="p-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-2xs">
                  {block}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs font-mono">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Safety code copied' : 'Copy code'}</span>
              </button>

              <div className="text-[10px] text-[var(--text-muted)] flex items-center space-x-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>60 Decimal Digits</span>
              </div>
            </div>
          </div>
        )}

        {/* Verification Status Action */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
          <div>
            <div className="text-xs font-semibold font-mono text-[var(--text-primary)]">
              {isVerified ? 'Marked as Verified' : 'Unverified Contact'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {isVerified ? 'Cryptographic keys confirmed identical' : 'Verify codes match to confirm identity'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleVerified}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
              isVerified
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
            }`}
          >
            {isVerified ? 'Unmark' : 'Mark as Verified'}
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium bg-[var(--surface-muted)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
