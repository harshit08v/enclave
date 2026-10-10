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
}

const AUTH_STORAGE_KEY = 'enclave_user_session';

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
}

export function createAnonymousUser(customName?: string): EnclaveUser {
  const id = generateSecureId('usr', 6);
  const randomSuffix = Math.floor(100 + (window?.crypto ? window.crypto.getRandomValues(new Uint16Array(1))[0] % 900 : 100));
  const name = customName?.trim() || `Participant ${randomSuffix}`;
  return {
    id,
    email: `${id}@enclave.local`,
    displayName: name,
    avatarSeed: id,
    createdAt: Date.now()
  };
}
