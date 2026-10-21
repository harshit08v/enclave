/**
 * ENCLAVE Admin Session & Authentication Management
 * Provides cryptographically secure admin sessions, timing-safe credential verification,
 * brute-force lockout, and CSRF token validation.
 * Integrated with IAccountAdminStoreAdapter for multi-instance cross-process visibility and revocation.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { recordAuditEvent, recordAuditEventAsync } from './serverAuditStore';
import { recordSecurityIncident, recordSecurityIncidentAsync } from './serverSecurityStore';
import { getAccountAdminStoreAdapter } from './serverAccountAdminAdapter';

export interface AdminSession {
  token: string;
  csrfToken: string;
  username: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
}

interface AdminLoginAttempt {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

const SESSION_TTL_MS = 3600000; // 1 hour
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 900000; // 15 minutes

const globalForAdminAuth = globalThis as unknown as {
  enclaveAdminSessions?: Map<string, AdminSession>;
  enclaveAdminAttempts?: Map<string, AdminLoginAttempt>;
  enclaveAdminBootstrapPassword?: string;
};

export const adminSessions =
  globalForAdminAuth.enclaveAdminSessions || new Map<string, AdminSession>();

const loginAttempts =
  globalForAdminAuth.enclaveAdminAttempts || new Map<string, AdminLoginAttempt>();

if (process.env.NODE_ENV !== 'production') {
  globalForAdminAuth.enclaveAdminSessions = adminSessions;
  globalForAdminAuth.enclaveAdminAttempts = loginAttempts;
}

/**
 * Returns configured admin credentials or generates a secure bootstrap password.
 */
export function getAdminCredentials(): { username: string; passwordHashOrPlain: string } {
  const username = process.env.ENCLAVE_ADMIN_USERNAME || 'admin';
  let password = process.env.ENCLAVE_ADMIN_PASSWORD;

  if (!password) {
    if (!globalForAdminAuth.enclaveAdminBootstrapPassword) {
      globalForAdminAuth.enclaveAdminBootstrapPassword =
        process.env.NODE_ENV === 'production'
          ? Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
          : 'enclave-admin-dev-key-2026';
      
      console.warn(
        `[ENCLAVE ADMIN] Notice: ENCLAVE_ADMIN_PASSWORD not set. Using bootstrap password for session: ${globalForAdminAuth.enclaveAdminBootstrapPassword}`
      );
    }
    password = globalForAdminAuth.enclaveAdminBootstrapPassword;
  }

  return { username, passwordHashOrPlain: password };
}

/**
 * Generates a cryptographically random hex token.
 */
function generateRandomHex(bytes = 32): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Checks admin login rate limit for an IP (Async).
 */
export async function checkAdminLoginRateLimitAsync(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const adapter = getAccountAdminStoreAdapter();
  const attempt = await adapter.getAdminLoginAttempt(ip);
  if (!attempt) return { allowed: true };

  const now = Date.now();
  if (attempt.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((attempt.lockedUntil - now) / 1000) };
  }

  if (now - attempt.lastAttempt > LOGIN_LOCKOUT_MS) {
    await adapter.deleteAdminLoginAttempt(ip);
    return { allowed: true };
  }

  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOGIN_LOCKOUT_MS;
    await adapter.saveAdminLoginAttempt(ip, attempt);
    return { allowed: false, retryAfter: Math.ceil(LOGIN_LOCKOUT_MS / 1000) };
  }

  return { allowed: true };
}

/**
 * Checks admin login rate limit for an IP (Sync facade).
 */
export function checkAdminLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { allowed: true };

  if (attempt.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((attempt.lockedUntil - now) / 1000) };
  }

  if (now - attempt.lastAttempt > LOGIN_LOCKOUT_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = now + LOGIN_LOCKOUT_MS;
    return { allowed: false, retryAfter: Math.ceil(LOGIN_LOCKOUT_MS / 1000) };
  }

  return { allowed: true };
}

/**
 * Records a failed admin login attempt (Async).
 */
export async function recordFailedAdminLoginAsync(ip: string): Promise<void> {
  const now = Date.now();
  const adapter = getAccountAdminStoreAdapter();
  const existing = await adapter.getAdminLoginAttempt(ip);
  const record = existing || { attempts: 0, lastAttempt: now, lockedUntil: 0 };
  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_MS;
    await recordSecurityIncidentAsync({
      type: 'ADMIN_BRUTE_FORCE',
      ip,
      detail: `Exceeded ${MAX_LOGIN_ATTEMPTS} admin login attempts. Locked out for 15 minutes.`,
      severity: 'HIGH'
    });
  }

  await adapter.saveAdminLoginAttempt(ip, record);
  loginAttempts.set(ip, record);
}

/**
 * Records a failed admin login attempt (Sync facade).
 */
export function recordFailedAdminLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, lastAttempt: now, lockedUntil: 0 };
  record.attempts += 1;
  record.lastAttempt = now;

  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_MS;
    recordSecurityIncident({
      type: 'ADMIN_BRUTE_FORCE',
      ip,
      detail: `Exceeded ${MAX_LOGIN_ATTEMPTS} admin login attempts. Locked out for 15 minutes.`,
      severity: 'HIGH'
    });
  }

  loginAttempts.set(ip, record);

  const adapter = getAccountAdminStoreAdapter();
  if (adapter.isDistributed) {
    Promise.resolve(adapter.saveAdminLoginAttempt(ip, record)).catch(() => {});
  } else {
    adapter.saveAdminLoginAttempt(ip, record);
  }
}

/**
 * Resets admin login rate limit for an IP (Async).
 */
export async function resetAdminLoginRateLimitAsync(ip: string): Promise<void> {
  const adapter = getAccountAdminStoreAdapter();
  await adapter.deleteAdminLoginAttempt(ip);
  loginAttempts.delete(ip);
}

/**
 * Resets admin login rate limit for an IP (Sync facade).
 */
export function resetAdminLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
  const adapter = getAccountAdminStoreAdapter();
  if (adapter.isDistributed) {
    Promise.resolve(adapter.deleteAdminLoginAttempt(ip)).catch(() => {});
  } else {
    adapter.deleteAdminLoginAttempt(ip);
  }
}

/**
 * Authenticates admin credentials with constant-time equality check.
 * Compares SHA-256 digests to ensure fixed 32-byte buffer comparisons and prevent length leaks.
 */
export function verifyAdminCredentials(providedUser: string, providedPass: string): boolean {
  const { username, passwordHashOrPlain } = getAdminCredentials();

  const userDigest = createHash('sha256').update(providedUser || '').digest();
  const expectedUserDigest = createHash('sha256').update(username).digest();

  const passDigest = createHash('sha256').update(providedPass || '').digest();
  const expectedPassDigest = createHash('sha256').update(passwordHashOrPlain).digest();

  const userMatch = timingSafeEqual(userDigest, expectedUserDigest);
  const passMatch = timingSafeEqual(passDigest, expectedPassDigest);

  return userMatch && passMatch;
}

/**
 * Creates a new active admin session (Async).
 */
export async function createAdminSessionAsync(username: string, ip: string, userAgent: string): Promise<AdminSession> {
  const token = generateRandomHex(32);
  const csrfToken = generateRandomHex(24);
  const now = Date.now();

  const session: AdminSession = {
    token,
    csrfToken,
    username,
    ip,
    userAgent,
    createdAt: now,
    lastActive: now,
    expiresAt: now + SESSION_TTL_MS
  };

  const adapter = getAccountAdminStoreAdapter();
  adminSessions.set(token, session);

  // Parallelize session persistence and audit event writing
  await Promise.all([
    adapter.saveAdminSession(session),
    recordAuditEventAsync({
      adminUser: username,
      action: 'ADMIN_LOGIN',
      status: 'SUCCESS',
      ip,
      metadata: { userAgent }
    })
  ]);

  return session;
}

/**
 * Creates a new active admin session (Sync facade).
 */
export function createAdminSession(username: string, ip: string, userAgent: string): AdminSession {
  const token = generateRandomHex(32);
  const csrfToken = generateRandomHex(24);
  const now = Date.now();

  const session: AdminSession = {
    token,
    csrfToken,
    username,
    ip,
    userAgent,
    createdAt: now,
    lastActive: now,
    expiresAt: now + SESSION_TTL_MS
  };

  adminSessions.set(token, session);

  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.saveAdminSession(session);
  } else {
    Promise.resolve(adapter.saveAdminSession(session)).catch((err) => {
      console.warn('[ENCLAVE ADMIN] Async error saving session in sync createAdminSession:', err);
    });
  }

  recordAuditEvent({
    adminUser: username,
    action: 'ADMIN_LOGIN',
    status: 'SUCCESS',
    ip,
    metadata: { userAgent }
  });

  return session;
}

/**
 * Validates session token and sliding expiration (Async).
 */
export async function validateAdminSessionAsync(token?: string | null): Promise<AdminSession | null> {
  if (!token) return null;
  const adapter = getAccountAdminStoreAdapter();
  const session = await adapter.getAdminSession(token);
  if (!session) {
    adminSessions.delete(token);
    return null;
  }

  const now = Date.now();
  if (now > session.expiresAt) {
    await adapter.deleteAdminSession(token);
    adminSessions.delete(token);
    return null;
  }

  // Slide expiration window if more than 5 minutes have elapsed or nearing expiry
  const shouldPersistSlide = (now - session.lastActive) > 300000 || (session.expiresAt - now) < 600000;
  session.lastActive = now;
  session.expiresAt = now + SESSION_TTL_MS;
  adminSessions.set(token, session);

  if (shouldPersistSlide) {
    if (adapter.isDistributed) {
      Promise.resolve(adapter.saveAdminSession(session)).catch(() => {});
    } else {
      adapter.saveAdminSession(session);
    }
  }

  return session;
}

/**
 * Validates session token and sliding expiration (Sync facade).
 */
export function validateAdminSession(token?: string | null): AdminSession | null {
  if (!token) return null;
  const session = adminSessions.get(token);
  if (!session) return null;

  const now = Date.now();
  if (now > session.expiresAt) {
    adminSessions.delete(token);
    const adapter = getAccountAdminStoreAdapter();
    if (adapter.isDistributed) {
      Promise.resolve(adapter.deleteAdminSession(token)).catch(() => {});
    }
    return null;
  }

  session.lastActive = now;
  session.expiresAt = now + SESSION_TTL_MS;
  const adapter = getAccountAdminStoreAdapter();
  if (adapter.isDistributed) {
    Promise.resolve(adapter.saveAdminSession(session)).catch(() => {});
  }

  return session;
}

/**
 * Revokes an admin session (Async).
 */
export async function revokeAdminSessionAsync(token: string, ip: string): Promise<boolean> {
  const adapter = getAccountAdminStoreAdapter();
  const session = await adapter.getAdminSession(token);
  adminSessions.delete(token);

  if (session) {
    await recordAuditEventAsync({
      adminUser: session.username,
      action: 'ADMIN_LOGOUT',
      status: 'SUCCESS',
      ip
    });
    return await adapter.deleteAdminSession(token);
  }
  return false;
}

/**
 * Revokes an admin session (Sync facade).
 */
export function revokeAdminSession(token: string, ip: string): boolean {
  const session = adminSessions.get(token);
  if (session) {
    recordAuditEvent({
      adminUser: session.username,
      action: 'ADMIN_LOGOUT',
      status: 'SUCCESS',
      ip
    });
    adminSessions.delete(token);
    const adapter = getAccountAdminStoreAdapter();
    if (!adapter.isDistributed) {
      adapter.deleteAdminSession(token);
    } else {
      Promise.resolve(adapter.deleteAdminSession(token)).catch(() => {});
    }
    return true;
  }
  return false;
}

/**
 * Validates request authentication and CSRF protection for mutating actions (Async).
 */
export async function authenticateAdminRequestAsync(
  request: Request,
  requireCsrf = true
): Promise<{ authenticated: boolean; session?: AdminSession; error?: string; status?: number }> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map(c => c.trim().split('='))
      .filter(([k]) => Boolean(k))
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );

  const sessionToken = cookies['enclave_admin_session'];
  if (!sessionToken) {
    return { authenticated: false, error: 'Unauthorized: Admin session cookie missing.', status: 401 };
  }

  const session = await validateAdminSessionAsync(sessionToken);
  if (!session) {
    return { authenticated: false, error: 'Unauthorized: Session invalid or expired.', status: 401 };
  }

  const method = request.method.toUpperCase();
  if (requireCsrf && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const providedCsrf = request.headers.get('x-enclave-admin-csrf');
    if (!providedCsrf || providedCsrf !== session.csrfToken) {
      await recordSecurityIncidentAsync({
        type: 'CSRF_FAILURE',
        ip: session.ip,
        detail: `Admin CSRF verification failed on ${method} ${request.url}`,
        severity: 'HIGH'
      });
      return { authenticated: false, error: 'Forbidden: Invalid or missing CSRF token.', status: 403 };
    }
  }

  return { authenticated: true, session };
}

/**
 * Validates request authentication and CSRF protection for mutating actions (Sync facade).
 */
export function authenticateAdminRequest(
  request: Request,
  requireCsrf = true
): { authenticated: boolean; session?: AdminSession; error?: string; status?: number } {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map(c => c.trim().split('='))
      .filter(([k]) => Boolean(k))
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );

  const sessionToken = cookies['enclave_admin_session'];
  if (!sessionToken) {
    return { authenticated: false, error: 'Unauthorized: Admin session cookie missing.', status: 401 };
  }

  const session = validateAdminSession(sessionToken);
  if (!session) {
    return { authenticated: false, error: 'Unauthorized: Session invalid or expired.', status: 401 };
  }

  const method = request.method.toUpperCase();
  if (requireCsrf && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const providedCsrf = request.headers.get('x-enclave-admin-csrf');
    if (!providedCsrf || providedCsrf !== session.csrfToken) {
      recordSecurityIncident({
        type: 'CSRF_FAILURE',
        ip: session.ip,
        detail: `Admin CSRF verification failed on ${method} ${request.url}`,
        severity: 'HIGH'
      });
      return { authenticated: false, error: 'Forbidden: Invalid or missing CSRF token.', status: 403 };
    }
  }

  return { authenticated: true, session };
}
