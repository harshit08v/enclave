/**
 * ENCLAVE User Account & Security Management Store
 * Handles profile identity updates, email change verification tokens,
 * active sessions, password management, and account deletion with strict security boundaries.
 */

import { generateSecureId } from '@/packages/crypto';
import { getStoredUser, saveUserSession, clearUserSession, EnclaveUser } from './authStore';

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string;
  locationHint: string;
  createdAt: number;
  lastActive: number;
  isCurrent: boolean;
}

export interface EmailChangeRequest {
  token: string;
  userId: string;
  newEmail: string;
  requestedAt: number;
  expiresAt: number;
  used: boolean;
}

const SESSIONS_STORAGE_KEY = 'enclave_active_sessions';
const EMAIL_CHANGE_STORAGE_KEY = 'enclave_pending_email_change';
const PASSWORD_HASH_STORAGE_KEY = 'enclave_pwd_record';

/**
 * Gets a clean device info string based on user agent
 */
export function getClientDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  return `${os} · ${browser}`;
}

/**
 * Derives user initials for minimalist avatars
 */
export function getInitials(name: string): string {
  if (!name) return 'E';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Updates profile fields (e.g. Display Name, Avatar)
 */
export function updateProfile(updates: {
  displayName?: string;
  avatarUrl?: string | null;
}): { success: boolean; user?: EnclaveUser; error?: string } {
  const current = getStoredUser();
  if (!current) {
    return { success: false, error: 'No active session found.' };
  }

  const updatedUser: EnclaveUser = { ...current };

  if (updates.displayName !== undefined) {
    const trimmed = updates.displayName.trim();
    // Validate display name: 2-40 chars, no control/script tags
    if (!trimmed || trimmed.length < 2 || trimmed.length > 40) {
      return { success: false, error: 'Name must be between 2 and 40 characters.' };
    }
    if (/[<>{}]/.test(trimmed)) {
      return { success: false, error: 'Name contains invalid characters.' };
    }
    updatedUser.displayName = trimmed;
  }

  if (updates.avatarUrl !== undefined) {
    updatedUser.avatarUrl = updates.avatarUrl || undefined;
  }

  saveUserSession(updatedUser, true);
  return { success: true, user: updatedUser };
}

/**
 * Requests an email change and generates a secure verification token (15-min expiry)
 */
export function requestEmailChange(newEmail: string): {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
} {
  const current = getStoredUser();
  if (!current) {
    return { success: false, error: 'Authentication required.' };
  }

  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  if (email === current.email.toLowerCase()) {
    return { success: false, error: 'New email address must be different from current email.' };
  }

  const token = generateSecureId('emv', 12);
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes

  const request: EmailChangeRequest = {
    token,
    userId: current.id,
    newEmail: email,
    requestedAt: now,
    expiresAt,
    used: false
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(EMAIL_CHANGE_STORAGE_KEY, JSON.stringify(request));
  }

  return {
    success: true,
    token,
    expiresAt
  };
}

/**
 * Verifies an email change token and updates account email
 */
export function verifyEmailChange(token: string): {
  success: boolean;
  updatedUser?: EnclaveUser;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Verification unavailable.' };
  }

  const raw = localStorage.getItem(EMAIL_CHANGE_STORAGE_KEY);
  if (!raw) {
    return { success: false, error: 'No pending email change found.' };
  }

  try {
    const request: EmailChangeRequest = JSON.parse(raw);

    if (request.used) {
      return { success: false, error: 'This verification token has already been used.' };
    }

    if (Date.now() > request.expiresAt) {
      localStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
      return { success: false, error: 'Verification link has expired. Please request a new one.' };
    }

    if (request.token !== token.trim()) {
      return { success: false, error: 'Invalid verification token.' };
    }

    const current = getStoredUser();
    if (!current || current.id !== request.userId) {
      return { success: false, error: 'Session mismatch. Please log in.' };
    }

    const updatedUser: EnclaveUser = {
      ...current,
      email: request.newEmail
    };

    request.used = true;
    localStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
    saveUserSession(updatedUser, true);

    return { success: true, updatedUser };
  } catch {
    return { success: false, error: 'Verification failed.' };
  }
}

/**
 * Changes password with validation
 */
export function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  signOutOtherDevices = true
): { success: boolean; error?: string } {
  if (!currentPassword) {
    return { success: false, error: 'Current password is required.' };
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.' };
  }

  // Check current password if one is recorded
  if (typeof window !== 'undefined') {
    const existingPwd = localStorage.getItem(PASSWORD_HASH_STORAGE_KEY);
    if (existingPwd && existingPwd !== currentPassword) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    // Record new password
    localStorage.setItem(PASSWORD_HASH_STORAGE_KEY, newPassword);
  }

  if (signOutOtherDevices) {
    revokeOtherSessions();
  }

  return { success: true };
}

/**
 * Retrieves active sessions for current user
 */
export function getActiveSessions(): UserSession[] {
  if (typeof window === 'undefined') return [];

  const user = getStoredUser();
  if (!user) return [];

  const currentDevice = getClientDeviceInfo();
  const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);

  let sessions: UserSession[] = [];
  if (raw) {
    try {
      sessions = JSON.parse(raw);
    } catch {
      sessions = [];
    }
  }

  // Ensure current session is present
  const currentSessionExists = sessions.some(s => s.isCurrent && s.userId === user.id);
  if (!currentSessionExists) {
    const currentSession: UserSession = {
      id: 'sess_' + generateSecureId('', 6),
      userId: user.id,
      deviceInfo: currentDevice,
      locationHint: 'Current device',
      createdAt: user.createdAt || Date.now(),
      lastActive: Date.now(),
      isCurrent: true
    };
    sessions = [currentSession, ...sessions.filter(s => !s.isCurrent)];
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }

  return sessions.filter(s => s.userId === user.id);
}

/**
 * Revokes all sessions except the current one
 */
export function revokeOtherSessions(): void {
  if (typeof window === 'undefined') return;
  const user = getStoredUser();
  if (!user) return;

  const currentDevice = getClientDeviceInfo();
  const currentSession: UserSession = {
    id: 'sess_' + generateSecureId('', 6),
    userId: user.id,
    deviceInfo: currentDevice,
    locationHint: 'Current device',
    createdAt: Date.now(),
    lastActive: Date.now(),
    isCurrent: true
  };

  localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([currentSession]));
}

/**
 * Completely deletes the user account, zeroizes active sessions and local data
 */
export function deleteAccount(): void {
  clearUserSession();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSIONS_STORAGE_KEY);
    localStorage.removeItem(EMAIL_CHANGE_STORAGE_KEY);
    localStorage.removeItem(PASSWORD_HASH_STORAGE_KEY);
  }
}
