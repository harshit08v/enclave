/**
 * ENCLAVE Auth & Ephemeral Transit Store — Hardened V1
 * Manages client user session and secure in-memory one-time transit secrets.
 * Uses CSPRNG for all identifiers. ZERO access pass persistence in localStorage or sessionStorage.
 */

import { generateSecureId } from '@/packages/crypto';

export interface EnclaveUser {
  id: string;
  email: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  createdAt: number;
  isGuest?: boolean;
  isVerified?: boolean;
  provider?: string;
  idToken?: string;
}

const AUTH_STORAGE_KEY = 'enclave_user_session';
const AUTH_TOKEN_KEY = 'enclave_firebase_token';

let inMemoryToken: string | null = null;

export function setCachedAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      if (typeof document !== 'undefined') {
        document.cookie = `enclave_firebase_token=${encodeURIComponent(token)}; path=/; SameSite=Lax; Secure`;
      }
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      if (typeof document !== 'undefined') {
        document.cookie = `enclave_firebase_token=; path=/; max-age=0; SameSite=Lax; Secure`;
      }
    }
  }
}

export function getCachedAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  }
  return null;
}

// Strict in-memory one-time pass transit store (RAM only, destroyed on first read)
const inMemoryPassTransit = new Map<string, { pass: string; expiresAt: number }>();

/**
 * Sets a one-time ephemeral pass in RAM for seamless creator entry.
 * Expires after 60 seconds.
 */
export function setEphemeralPassTransit(roomId: string, pass: string): void {
  inMemoryPassTransit.set(roomId, {
    pass,
    expiresAt: Date.now() + 60000
  });
}

/**
 * Reads the ephemeral transit pass without clearing it immediately,
 * allowing React StrictMode and initial mount cycles to safely read it.
 */
export function peekEphemeralPassTransit(roomId: string): string | null {
  const entry = inMemoryPassTransit.get(roomId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    inMemoryPassTransit.delete(roomId);
    return null;
  }
  return entry.pass;
}

/**
 * Consumes and immediately wipes the ephemeral pass from RAM.
 */
export function consumeEphemeralPassTransit(roomId: string): string | null {
  const entry = inMemoryPassTransit.get(roomId);
  if (!entry) return null;
  inMemoryPassTransit.delete(roomId);
  if (Date.now() > entry.expiresAt) return null;
  return entry.pass;
}

/**
 * Clears the ephemeral pass from RAM once successfully used.
 */
export function clearEphemeralPassTransit(roomId: string): void {
  inMemoryPassTransit.delete(roomId);
}

export function getStoredUser(): EnclaveUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user: EnclaveUser, remember = true): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(user);
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, raw);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, raw);
  }
}

export function clearUserSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  setCachedAuthToken(null);
}

export function createAnonymousUser(customName?: string): EnclaveUser {
  const id = generateSecureId('usr', 6);
  const randomSuffix = Math.floor(100 + (typeof window !== 'undefined' && window.crypto ? window.crypto.getRandomValues(new Uint16Array(1))[0] % 900 : 100));
  const name = customName?.trim() || `Participant ${randomSuffix}`;
  const user: EnclaveUser = {
    id,
    email: `${id}@enclave.local`,
    displayName: name,
    avatarSeed: id,
    createdAt: Date.now(),
    isGuest: true
  };
  if (typeof window !== 'undefined') {
    saveUserSession(user, false);
  }
  return user;
}
