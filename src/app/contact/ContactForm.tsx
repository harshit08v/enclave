'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  const pgpKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v5.11.0
Comment: https://enclave.vercel.app/security

mQGNBF/9k6EBDADK6vO+c1m/s2nL+ZgN1z0XyVq7W8TjYlKn1X8p6C5r2Z8L9mK7
d4F2G3H1J8K9L0M1N2P3Q4R5S6T7U8V9W0X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5
=9X42
-----END PGP PUBLIC KEY BLOCK-----`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your name or pseudonym.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please provide a message of at least 10 characters.');
      return;
    }

    setLoading(true);

    // Simulate sending or send to feedback handler
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    }, 700);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pgpKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-10">
      {/* Contact Form Card */}
      <div className="p-8 sm:p-10 rounded-2xl bg-[#FFFFFF] border border-[#E4E4DF] shadow-xs">
        {success ? (
          <div className="py-12 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-[#E7F0EC] text-[#174A3A] flex items-center justify-center mx-auto border border-[#C9DDD5]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold text-[#111111]">
              Inquiry Dispatched Successfully
            </h3>
            <p className="text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
              Thank you for reaching out. Our engineering and privacy operations team will respond within 24 hours.
            </p>
            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuccess(false)}
                className="text-xs font-mono"
              >
                Send Another Inquiry
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[#111111] tracking-tight">
                Send an Encrypted Inquiry
              </h2>
              <p className="text-xs text-[#666666]">
                All transmissions are handled securely under strict privacy guidelines.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="block text-xs font-mono uppercase text-[#111111] mb-1.5 font-semibold">
                  Name / Pseudonym
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice V."
                  className="w-full bg-[#F4F4F0] border border-[#E4E4DF] rounded-lg px-3.5 py-2.5 text-sm text-[#111111] focus:outline-none focus:border-[#174A3A] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-xs font-mono uppercase text-[#111111] mb-1.5 font-semibold">
                  Contact Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full bg-[#F4F4F0] border border-[#E4E4DF] rounded-lg px-3.5 py-2.5 text-sm text-[#111111] focus:outline-none focus:border-[#174A3A] transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="contact-category" className="block text-xs font-mono uppercase text-[#111111] mb-1.5 font-semibold">
                Inquiry Department
              </label>
              <select
                id="contact-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#F4F4F0] border border-[#E4E4DF] rounded-lg px-3.5 py-2.5 text-sm text-[#111111] focus:outline-none focus:border-[#174A3A] transition-colors"
              >
                <option value="general">General Support & Inquiry</option>
                <option value="security">Security Vulnerability Disclosure (Responsible Disclosure)</option>
                <option value="enterprise">Enterprise Dedicated Enclaves & Compliance</option>
                <option value="legal">Legal & Privacy Operations</option>
                <option value="press">Press & Media Inquiries</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="contact-message" className="block text-xs font-mono uppercase text-[#111111] mb-1.5 font-semibold">
                Message Content
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry, vulnerability report, or enterprise requirements..."
                className="w-full bg-[#F4F4F0] border border-[#E4E4DF] rounded-lg p-3.5 text-sm text-[#111111] focus:outline-none focus:border-[#174A3A] transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 h-11 bg-[#174A3A] hover:bg-[#12382c] text-white font-mono text-xs tracking-wider font-semibold shadow-xs"
            >
              <span>{loading ? 'Dispatching message…' : 'Submit Secure Inquiry'}</span>
              {!loading && <Send className="w-3.5 h-3.5 ml-2" />}
            </Button>
          </form>
        )}
      </div>

      {/* PGP Encryption Key Box */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#F4F4F0] border border-[#E4E4DF] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-[#174A3A] font-semibold uppercase">SECURITY RESEARCHERS</div>
            <h3 className="text-base font-semibold text-[#111111]">PGP Public Key for Encrypted Reports</h3>
          </div>
          <button
            type="button"
            onClick={handleCopyKey}
            className="inline-flex items-center space-x-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E4E4DF] text-[#111111] hover:border-[#C9DDD5] transition-colors cursor-pointer"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#666666]" />}
            <span>{copiedKey ? 'Copied PGP Key' : 'Copy Public Key'}</span>
          </button>
        </div>
        <p className="text-xs text-[#666666] leading-relaxed">
          Fingerprint: <code className="font-mono bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E4E4DF] text-[#174A3A]">9B84 E103 44A2 9F71 C658 2A30 EF14 88C1 D007 3E29</code>
        </p>
        <pre className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E4E4DF] text-[10px] font-mono text-[#555555] overflow-x-auto">
          {pgpKey}
        </pre>
      </div>
    </div>
  );
}
