'use client';

import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { WirePacket } from '@/packages/protocol';
import { Button } from '@/components/ui/button';

interface CiphertextInspectorModalProps {
  packet: WirePacket | null;
  onClose: () => void;
}

export default function CiphertextInspectorModal({ packet, onClose }: CiphertextInspectorModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!packet) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(packet, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-xl relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--accent)] font-medium mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>Zero-Plaintext In-Transit</span>
            </div>
            <h3 className="text-base font-mono font-semibold text-[var(--text-primary)] tracking-tight">
              Ciphertext Wire Inspector
            </h3>
            <div className="text-xs font-mono text-[var(--text-muted)]">
              Raw payload transmitted over untrusted relay network
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technical Explanations */}
        <div className="space-y-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] space-y-2">
            <div className="text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
              Cryptographic Parameters
            </div>
            <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)]">
              <div>Cipher: <span className="text-[var(--accent)] font-semibold">AES-256-GCM</span></div>
              <div>Nonce (IV): <span className="text-[var(--text-primary)] font-semibold">96-bit Random</span></div>
              <div>Packet ID: <span className="text-[var(--text-primary)]">{packet.packetId}</span></div>
              <div>Auth Tag: <span className="text-[var(--accent)] font-semibold">128-bit Polyval</span></div>
            </div>
          </div>

          {/* Raw JSON viewer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                Raw Wire Frame (JSON)
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyJson}
                className="h-8 px-3 text-xs font-mono font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--accent)] mr-1.5" />
                    <span>Copied ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-[var(--text-secondary)]" />
                    <span>Copy JSON</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] overflow-x-auto max-h-56 leading-relaxed selection:bg-[var(--accent-soft)]">
              {JSON.stringify(packet, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          <span className="text-[var(--accent)] font-medium">VERIFIED ZERO-PLAINTEXT RELAY</span>
          <Button variant="secondary" size="sm" onClick={onClose} className="border-[var(--border)]">
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
}
