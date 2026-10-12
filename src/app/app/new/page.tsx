'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Copy,
  Check,
  ArrowLeft,
  Share2,
  Sparkles,
  Lock,
  Link2,
  KeyRound,
  FileText
} from 'lucide-react';
import { getStoredUser, saveUserSession, setEphemeralPassTransit, EnclaveUser } from '@/lib/authStore';
import {
  generateDicewarePassphrase,
  deriveRoomKeys,
  createAndWrapRoomSecret,
  generateSecureId,
  getOpenAccessPassphrase
} from '@/packages/crypto';
import { Button } from '@/components/ui/button';
import UserNavMenu from '@/components/app/UserNavMenu';

export function formatRoomInvitation(roomId: string, roomUrl: string, hasPass: boolean): string {
  if (hasPass) {
    return `You're invited to a private ENCLAVE room.\n\nRoom ID: ${roomId}\nJoin here: ${roomUrl}\n\nPlease use the access pass shared with you separately, if required.\n\n— ENCLAVE\nPrivate by design. Gone when you leave.`;
  }
  return `You're invited to a private ENCLAVE room.\n\nRoom ID: ${roomId}\nJoin here: ${roomUrl}\n\n— ENCLAVE\nPrivate by design. Gone when you leave.`;
}

export default function CreateEnclavePage() {
  const router = useRouter();
  const [user, setUser] = useState<EnclaveUser | null>(null);

  // Access Mode: 'with_pass' | 'without_pass'
  const [accessMode, setAccessMode] = useState<'with_pass' | 'without_pass'>('with_pass');
  const [customPass, setCustomPass] = useState('');
  const [loading, setLoading] = useState(false);

  // Created Room Output State
  const [createdRoom, setCreatedRoom] = useState<{
    roomId: string;
    roomUrl: string;
    accessMode: 'with_pass' | 'without_pass';
    passphrase?: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const sessionUser = getStoredUser();
    if (!sessionUser) {
      router.push('/login');
      return;
    }
    setUser(sessionUser);

    // Reconcile verification status with server if registered account
    if (!sessionUser.isGuest && sessionUser.email) {
      fetch(`/api/auth/register?email=${encodeURIComponent(sessionUser.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists && data.isVerified !== sessionUser.isVerified) {
            const updated = { ...sessionUser, isVerified: data.isVerified };
            saveUserSession(updated, true);
            setUser(updated);
          }
        })
        .catch(() => {});
    }

    setCustomPass(generateDicewarePassphrase());
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, [router]);

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    setResendStatus(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email: user.email })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResendStatus(data.message || 'Verification email dispatched. Please check your inbox.');
      } else {
        setResendStatus(data.error || 'Failed to resend verification email.');
      }
    } catch {
      setResendStatus('Network error requesting resend.');
    } finally {
      setResending(false);
    }
  };

  const handleGeneratePass = () => {
    setCustomPass(generateDicewarePassphrase());
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && !user.isGuest && user.isVerified === false) {
      alert('Email verification required. Please verify your email before creating rooms.');
      return;
    }
    if (accessMode === 'with_pass' && !customPass.trim()) return;

    setLoading(true);

    try {
      // 1. Generate unpredictable CSPRNG room ID (e.g. 8f92-c0e4)
      const rawHex = generateSecureId('', 4);
      const roomId = `${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}`;

      // 2. Determine secret key derivation seed based on access mode
      const activePassphrase = accessMode === 'with_pass'
        ? customPass.trim()
        : getOpenAccessPassphrase(roomId);

      // 3. Derive cryptographic keys via Argon2id (KWK + Auth Commitment)
      const keyBundle = await deriveRoomKeys(activePassphrase);

      // 4. Generate 256-bit CSPRNG Room Master Secret and wrap with KWK
      const { wrappedBundle } = await createAndWrapRoomSecret(keyBundle.keyWrappingKey);

      // Get Firebase ID token if user is authenticated with Firebase
      const { getFirebaseIdToken } = await import('@/lib/firebaseClient');
      const idToken = await getFirebaseIdToken();

      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) {
        reqHeaders['Authorization'] = `Bearer ${idToken}`;
      }

      // 5. Register public metadata on server
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          roomId,
          salt: keyBundle.salt,
          authCommitment: keyBundle.authCommitment,
          wrappedSecretBundle: wrappedBundle,
          oneTimeAccess: false,
          requirePass: accessMode === 'with_pass',
          accessMode,
          creatorId: user?.id
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize chamber on relay');
      }

      const roomUrl = `${window.location.origin}/r/${roomId}`;

      setCreatedRoom({
        roomId,
        roomUrl,
        accessMode,
        passphrase: accessMode === 'with_pass' ? activePassphrase : undefined
      });
    } catch (err: any) {
      alert(err.message || 'Error creating enclave room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'link' | 'id' | 'pass' | 'invite') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else if (type === 'pass') {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else if (type === 'invite') {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!createdRoom) return;
    const shareText = formatRoomInvitation(
      createdRoom.roomId,
      createdRoom.roomUrl,
      createdRoom.accessMode === 'with_pass'
    );
    try {
      await navigator.share({
        title: 'Join ENCLAVE Room',
        text: shareText,
        url: createdRoom.roomUrl
      });
    } catch {
      // User dismissed share dialog
    }
  };

  const handleEnterRoom = () => {
    if (!createdRoom) return;
    if (createdRoom.accessMode === 'with_pass' && createdRoom.passphrase) {
      setEphemeralPassTransit(createdRoom.roomId, createdRoom.passphrase);
    }
    router.push(`/r/${createdRoom.roomId}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-center py-12 px-4 sm:px-6 relative selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Subtle Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-grid-subtle"
      />

      {/* Header Navigation */}
      <div className="max-w-xl mx-auto w-full mb-8 flex items-center justify-between relative z-10">
        <Link
          href="/app"
          className="inline-flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Workspace</span>
        </Link>

        <UserNavMenu user={user} />
      </div>

      <div className="max-w-xl mx-auto w-full relative z-10">
        {!createdRoom ? (
          /* STEP 1: CHOOSE ACCESS MODE & CREATE */
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 shadow-xs space-y-8">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--accent)] font-semibold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>Room Setup</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
                How should people enter?
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Choose how participants access this private space.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-6">
              {/* Access Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* OPTION 1: WITH PASS */}
                <div
                  onClick={() => setAccessMode('with_pass')}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    accessMode === 'with_pass'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-xs ring-1 ring-[var(--accent)]/30'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                      <Lock className="w-3 h-3" />
                      <span>MORE PRIVATE</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        accessMode === 'with_pass'
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border-strong)] bg-[var(--surface)]'
                      }`}
                    >
                      {accessMode === 'with_pass' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      WITH PASS
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Share the room link and pass separately.
                    </p>
                  </div>
                </div>

                {/* OPTION 2: WITHOUT PASS */}
                <div
                  onClick={() => setAccessMode('without_pass')}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    accessMode === 'without_pass'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-xs ring-1 ring-[var(--accent)]/30'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
                      <Link2 className="w-3 h-3" />
                      <span>LINK ACCESS</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        accessMode === 'without_pass'
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border-strong)] bg-[var(--surface)]'
                      }`}
                    >
                      {accessMode === 'without_pass' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      WITHOUT PASS
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      Anyone with the room link can enter.
                    </p>
                  </div>
                </div>
              </div>

              {/* WITH PASS INPUT */}
              {accessMode === 'with_pass' ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">
                      Set an access pass
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Anyone with the room link will still need this pass to enter.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customPass}
                      onChange={(e) => setCustomPass(e.target.value)}
                      placeholder="Enter access pass"
                      className="w-full bg-[var(--surface-muted)] border border-[var(--border-strong)] rounded-lg pl-3.5 pr-28 py-2.5 text-sm font-mono text-[var(--accent)] font-medium focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePass}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Generate a random pass"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-strong)] text-xs text-[var(--text-secondary)] leading-relaxed">
                  Anyone with the link can enter while the room is open. No extra access pass required.
                </div>
              )}

              {/* Unverified Account Gate */}
              {user && !user.isGuest && user.isVerified === false && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono space-y-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>EMAIL VERIFICATION REQUIRED</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Your account ({user.email}) must be verified before you can initialize encrypted rooms.
                  </p>
                  {resendStatus && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {resendStatus}
                    </p>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-colors font-medium text-xs cursor-pointer disabled:opacity-50"
                    >
                      {resending ? 'Sending…' : 'Resend Verification Email'}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading || (user && !user.isGuest && user.isVerified === false) || (accessMode === 'with_pass' && !customPass.trim())}
                  className="w-full h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold shadow-xs disabled:opacity-50"
                  size="lg"
                >
                  <span>
                    {loading
                      ? 'Creating room…'
                      : (user && !user.isGuest && user.isVerified === false)
                      ? 'Email verification required'
                      : accessMode === 'with_pass'
                      ? 'Create private room'
                      : 'Create room'}
                  </span>
                  {!loading && (user && !user.isGuest && user.isVerified === false ? null : <ArrowRight className="w-4 h-4 ml-1.5" />)}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: ROOM READY (CLEAN SHARE SCREEN) */
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono text-[var(--accent)] font-semibold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span>{createdRoom.accessMode === 'with_pass' ? 'PASS REQUIRED' : 'LINK ACCESS'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
                YOUR ROOM IS READY.
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {createdRoom.accessMode === 'with_pass'
                  ? 'Share the room link here. Send the access pass separately.'
                  : 'Anyone with this link can enter.'}
              </p>
            </div>

            {/* 1. ROOM ID ROW */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
                    ROOM ID
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Enter this ID to join a room.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[var(--surface-muted)] border border-[var(--border-strong)] rounded-lg px-3.5 py-2.5 text-sm font-mono font-semibold text-[var(--text-primary)] select-all">
                  {createdRoom.roomId}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  onClick={() => copyToClipboard(createdRoom.roomId, 'id')}
                  className="shrink-0 h-11 px-4 text-xs font-mono font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                      <span>Copied ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-[var(--text-secondary)]" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 2. JOIN LINK ROW */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold">
                JOIN LINK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdRoom.roomUrl}
                  className="flex-1 bg-[var(--surface-muted)] border border-[var(--border-strong)] rounded-lg px-3.5 py-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none select-all truncate"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  onClick={() => copyToClipboard(createdRoom.roomUrl, 'link')}
                  className="shrink-0 h-11 px-4 text-xs font-mono font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                      <span>Copied ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-[var(--text-secondary)]" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 3. ACCESS PASS DISPLAY (IF WITH PASS) */}
            {createdRoom.accessMode === 'with_pass' && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-strong)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--accent)] font-semibold flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>ACCESS PASS</span>
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(createdRoom.passphrase || '', 'pass')}
                      className="h-8 px-2.5 text-[11px] font-mono border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
                    >
                      {copiedPass ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-[var(--accent)]" />
                          <span>Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1 text-[var(--text-secondary)]" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-sm text-[var(--text-primary)] font-medium bg-[var(--surface)] px-3.5 py-2.5 rounded-lg border border-[var(--border-strong)] select-all">
                    {createdRoom.passphrase}
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Send the access pass separately via a second secure channel for enhanced security.
                </p>
              </div>
            )}

            {/* Copy Formatted Invitation Bar */}
            <div className="pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  copyToClipboard(
                    formatRoomInvitation(
                      createdRoom.roomId,
                      createdRoom.roomUrl,
                      createdRoom.accessMode === 'with_pass'
                    ),
                    'invite'
                  )
                }
                className="w-full h-11 text-xs font-mono border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] font-semibold shadow-xs"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                    <span>Invitation Copied ✓</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                    <span>Copy Full Invitation Text</span>
                  </>
                )}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {canShare && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleNativeShare}
                  className="flex-1 h-11 text-xs font-mono font-semibold border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />
                  <span>Share</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={handleEnterRoom}
                className="flex-1 h-11 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold shadow-xs"
              >
                <span>Open room</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
