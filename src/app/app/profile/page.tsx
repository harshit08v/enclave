'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Shield,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  Trash2,
  LogOut,
  Check,
  AlertCircle,
  Camera,
  X,
  KeyRound,
  Eye,
  EyeOff,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { getStoredUser, clearUserSession, EnclaveUser } from '@/lib/authStore';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  getActiveSessions,
  revokeOtherSessions,
  fetchActiveSessionsAsync,
  revokeSessionAsync,
  revokeOtherSessionsAsync,
  deleteAccount,
  getInitials,
  UserSession
} from '@/lib/userAccountStore';
import { useTheme, ThemeMode } from '@/lib/theme';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // User State
  const [user, setUser] = useState<EnclaveUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Display Name Edit State
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Email Change State
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailStep, setEmailStep] = useState<'idle' | 'requested' | 'verifying'>('idle');
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState(false);

  // Modals & Confirmation States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Avatar Upload Ref
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sessionUser = getStoredUser();
    if (!sessionUser) {
      router.push('/login');
      return;
    }
    setUser(sessionUser);
    setDisplayName(sessionUser.displayName);
    fetchActiveSessionsAsync().then(setSessions);
    setLoading(false);
  }, [router]);

  // Handle Profile Photo Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNameError('Please upload an image file (PNG, JPEG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNameError('Avatar photo exceeds 5MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const res = updateProfile({ avatarUrl: base64 });
      if (res.success && res.user) {
        setUser(res.user);
        setNameSuccess(true);
        setTimeout(() => setNameSuccess(false), 2500);
      }
    };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    const res = updateProfile({ avatarUrl: null });
    if (res.success && res.user) {
      setUser(res.user);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
    }
  };

  // Handle Display Name Save
  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setSavingName(true);

    const res = updateProfile({ displayName });
    if (!res.success) {
      setNameError(res.error || 'Failed to update name.');
      setSavingName(false);
      return;
    }

    if (res.user) {
      setUser(res.user);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
    }
    setSavingName(false);
  };

  // Handle Email Change Request
  const handleRequestEmailChange = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);

    const res = requestEmailChange(newEmail);
    if (!res.success) {
      setEmailMessage({ type: 'error', text: res.error || 'Failed to request email change.' });
      setEmailLoading(false);
      return;
    }

    setEmailStep('requested');
    setEmailMessage({
      type: 'info',
      text: `Verification code generated: ${res.token}. (A verification link was dispatched to ${newEmail}).`
    });
    setVerificationCode(res.token || '');
    setEmailLoading(false);
  };

  // Handle Email Verification Confirmation
  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setEmailLoading(true);

    const res = verifyEmailChange(verificationCode);
    if (!res.success) {
      setEmailMessage({ type: 'error', text: res.error || 'Verification failed.' });
      setEmailLoading(false);
      return;
    }

    if (res.updatedUser) {
      setUser(res.updatedUser);
      setEmailMessage({ type: 'success', text: 'Email address successfully verified and updated.' });
      setEmailStep('idle');
      setIsChangingEmail(false);
      setNewEmail('');
      setVerificationCode('');
    }
    setEmailLoading(false);
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordLoading(true);

    const res = changePassword(currentPassword, newPassword, confirmPassword, signOutOthers);
    if (!res.success) {
      setPasswordMessage({ type: 'error', text: res.error || 'Password change failed.' });
      setPasswordLoading(false);
      return;
    }

    setPasswordMessage({
      type: 'success',
      text: signOutOthers
        ? 'Password updated successfully. All other devices have been signed out.'
        : 'Password updated successfully.'
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordLoading(false);
    fetchActiveSessionsAsync().then(setSessions);
  };

  // Handle Sign Out Other Sessions
  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to sign out all other devices?')) return;
    setRevokingSessions(true);
    await revokeOtherSessionsAsync();
    const updated = await fetchActiveSessionsAsync();
    setSessions(updated);
    setRevokingSessions(false);
    setSessionSuccess(true);
    setTimeout(() => setSessionSuccess(false), 2500);
  };

  // Handle Revoke Single Session
  const handleRevokeSingleSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) return;
    setRevokingSessions(true);
    await revokeSessionAsync(sessionId);
    const updated = await fetchActiveSessionsAsync();
    setSessions(updated);
    setRevokingSessions(false);
  };

  // Handle Clear Local Data
  const handleClearLocalData = () => {
    clearUserSession();
    localStorage.clear();
    sessionStorage.clear();
    router.push('/');
  };

  // Handle Account Deletion
  const handleDeleteAccount = () => {
    setDeleting(true);
    deleteAccount();
    router.push('/');
  };

  // Handle Regular Sign Out
  const handleSignOut = () => {
    clearUserSession();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>LOADING PROFILE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/app"
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Return to Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2">
              <BrandLogo size="xs" href="/app" />
              <span className="text-[var(--border-strong)]">/</span>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                Account & Settings
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Page Title & Philosophy */}
        <div className="space-y-1 border-b border-[var(--border)] pb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[10px] font-mono font-semibold text-[var(--accent)] tracking-wider uppercase mb-2">
            <Shield className="w-3 h-3" />
            <span>PRIVATE IDENTITY</span>
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)]">
            Profile & Security
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your identity, authentication credentials, active sessions, and appearance preferences.
          </p>
        </div>

        {/* 1. IDENTITY & PROFILE SECTION */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Identity</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                How other participants identify you inside temporary rooms.
              </p>
            </div>
            {nameSuccess && (
              <span className="inline-flex items-center space-x-1 text-xs font-mono text-[var(--accent)]">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            )}
          </div>

          {nameError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-xs font-mono text-rose-700 dark:text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar Component */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-muted)] flex items-center justify-center text-xl font-mono font-semibold text-[var(--accent)] shadow-xs">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(user.displayName)}</span>
                )}
              </div>

              {/* Upload trigger */}
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-transform hover:scale-105 shadow-sm cursor-pointer"
                title="Change Photo"
                aria-label="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {user.displayName}
                </h3>
                {user.isGuest && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
                    GUEST
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[var(--text-secondary)]">{user.email}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs font-mono text-[var(--accent)] hover:underline cursor-pointer"
                >
                  Upload new photo
                </button>
                {user.avatarUrl && (
                  <>
                    <span className="text-[var(--border-strong)]">·</span>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs font-mono text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Remove photo
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Display Name Form */}
          <form onSubmit={handleSaveDisplayName} className="pt-2 space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Display Name
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={40}
                  className="flex-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
                <Button
                  type="submit"
                  disabled={savingName || displayName === user.displayName || !displayName.trim()}
                  className="h-10 px-4 text-xs font-mono bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                >
                  {savingName ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* 2. EMAIL ADDRESS & VERIFICATION */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Email Address</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Used for account identity and security recovery notifications.
              </p>
            </div>
            {!isChangingEmail && (
              <button
                onClick={() => {
                  setIsChangingEmail(true);
                  setNewEmail('');
                  setEmailMessage(null);
                }}
                className="text-xs font-mono text-[var(--accent)] hover:underline cursor-pointer"
              >
                Change email →
              </button>
            )}
          </div>

          {emailMessage && (
            <div
              className={`p-3.5 rounded-lg text-xs font-mono flex items-start space-x-2 ${
                emailMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                  : emailMessage.type === 'success'
                  ? 'bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)]'
                  : 'bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{emailMessage.text}</span>
            </div>
          )}

          {!isChangingEmail ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] text-sm font-mono">
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                <span className="text-[var(--text-primary)] font-medium">{user.email}</span>
              </div>
              <span className="text-[11px] text-[var(--accent)] flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
          ) : emailStep === 'idle' ? (
            <form onSubmit={handleRequestEmailChange} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangingEmail(false)}
                  className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={emailLoading || !newEmail.trim()}
                  className="h-10 px-4 text-xs font-mono bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                >
                  {emailLoading ? 'Sending...' : 'Send verification link'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                    Verification Code
                  </label>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Sent to {newEmail}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 12-character verification code"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors font-semibold"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep('idle');
                    setIsChangingEmail(false);
                  }}
                  className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={emailLoading || !verificationCode.trim()}
                  className="h-10 px-4 text-xs font-mono bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
                >
                  {emailLoading ? 'Verifying...' : 'Verify & Update Email'}
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* 3. PASSWORD MANAGEMENT */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Password & Access</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Update your account password and enforce multi-session signout.
            </p>
          </div>

          {passwordMessage && (
            <div
              className={`p-3.5 rounded-lg text-xs font-mono flex items-start space-x-2 ${
                passwordMessage.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                  : 'bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)]'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Current Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={signOutOthers}
                  onChange={(e) => setSignOutOthers(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>Sign out all other devices after password change</span>
              </label>

              <Button
                type="submit"
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="h-10 px-5 text-xs font-mono bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
              >
                {passwordLoading ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </form>
        </section>

        {/* 4. SECURITY CENTER */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Security Center</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Zero-knowledge cryptographic posture and access guarantees.
              </p>
            </div>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent)] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span>Account Protected</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-[var(--text-secondary)]">
                <KeyRound className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Authentication</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Password Protected</div>
              <p className="text-xs text-[var(--text-muted)]">
                Argon2id + PBKDF2 memory-hard pass-derived keys.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-[var(--text-secondary)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Encryption Engine</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)]">AES-256-GCM + AAD</div>
              <p className="text-xs text-[var(--text-muted)]">
                Canonical authenticated associated data per packet.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-[var(--text-secondary)]">
                <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Zero Server Logs</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)]">RAM Only Storage</div>
              <p className="text-xs text-[var(--text-muted)]">
                Plaintext never touches persistent server storage or logs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] space-y-1">
              <div className="flex items-center space-x-2 text-xs font-mono uppercase text-[var(--text-secondary)]">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Dissolution Policy</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Definitive Wipe</div>
              <p className="text-xs text-[var(--text-muted)]">
                Rooms and buffers are immediately zeroized on departure.
              </p>
            </div>
          </div>
        </section>

        {/* 5. ACTIVE SESSIONS */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-lg font-medium text-[var(--text-primary)]">Active Sessions</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Devices currently authenticated with this ENCLAVE account.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                disabled={revokingSessions}
                className="text-xs font-mono text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Sign out all other devices →
              </button>
            )}
          </div>

          {sessionSuccess && (
            <div className="p-3 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs font-mono text-[var(--accent)] flex items-center space-x-2">
              <Check className="w-3.5 h-3.5" />
              <span>All other devices have been signed out.</span>
            </div>
          )}

          <div className="space-y-3">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-[var(--text-secondary)]" />
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] flex items-center space-x-2">
                      <span>{sess.deviceInfo}</span>
                      {sess.isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]">
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Last active: {new Date(sess.lastActive).toLocaleDateString()} · {sess.locationHint}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)]">
                  <span>{sess.isCurrent ? 'Current session' : 'Active'}</span>
                  {!sess.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingleSession(sess.id)}
                      disabled={revokingSessions}
                      className="ml-2 px-2 py-0.5 rounded text-[10px] border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      title="Revoke this session"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. APPEARANCE SETTINGS */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Appearance</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Choose your visual theme. Changes persist across sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Theme Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 ring-2 ring-[var(--accent)]/20'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Sun className="w-4 h-4 text-[var(--accent)]" />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === 'light' ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                  {theme === 'light' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Light</div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Warm Ivory & Forest Green editorial palette.
              </p>
            </button>

            {/* Dark Theme Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 ring-2 ring-[var(--accent)]/20'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Moon className="w-4 h-4 text-[var(--accent)]" />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === 'dark' ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                  {theme === 'dark' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Dark</div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Charcoal & deep emerald technical theme.
              </p>
            </button>

            {/* System Theme Card */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'system'
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 ring-2 ring-[var(--accent)]/20'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Monitor className="w-4 h-4 text-[var(--accent)]" />
                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${theme === 'system' ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                  {theme === 'system' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">System</div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Matches your operating system preference.
              </p>
            </button>
          </div>
        </section>

        {/* 7. PRIVACY & LOCAL DATA */}
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Privacy Controls</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Manage client-side cache and cryptographic memory state.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Clear Local Storage Data</div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Wipes all stored session credentials, temporary keys, and cached state from this browser.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearDataModal(true)}
              className="h-9 px-4 text-xs font-mono shrink-0"
            >
              Clear local data
            </Button>
          </div>
        </section>

        {/* 8. DANGER ZONE: ACCOUNT DELETION */}
        <section className="bg-[var(--surface)] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="border-b border-rose-100 dark:border-rose-900/40 pb-4">
            <h2 className="text-lg font-medium text-rose-700 dark:text-rose-400">Danger Zone</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Irreversible account actions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Delete Account</div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Permanently delete your ENCLAVE account, active sessions, and identity records.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="h-10 px-5 text-xs font-mono bg-rose-700 hover:bg-rose-800 text-white shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Delete account</span>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-5 px-6 bg-[var(--background)] relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[var(--text-muted)]">
          <div>ENCLAVE · Private by design. Gone when you leave.</div>
          <div className="flex items-center space-x-4">
            <Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">
              Security
            </Link>
            <Link href="/how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
              How It Works
            </Link>
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">
              About
            </Link>
          </div>
        </div>
      </footer>

      {/* Clear Data Confirmation Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Clear local storage data?</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This will remove your current session, theme preferences, and in-memory caches on this device. You will be signed out immediately.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowClearDataModal(false)}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearLocalData}
                className="h-9 px-4 text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-mono"
              >
                Confirm & Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--surface)] border border-rose-200 dark:border-rose-900 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-medium">Delete account permanently?</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This action cannot be undone. Your user record, active device sessions, and account credentials will be completely obliterated from ENCLAVE.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                disabled={deleting}
                onClick={handleDeleteAccount}
                className="h-9 px-4 text-xs bg-rose-700 hover:bg-rose-800 text-white font-mono"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
