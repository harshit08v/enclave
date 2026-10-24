/**
 * ENCLAVE Server Account & Email Verification Store
 * Authoritative server-side persistent account model.
 * Never trusts client-side `isVerified` flags.
 * Verification tokens are cryptographically hashed before storage (zero raw tokens at rest).
 * Integrated with IAccountAdminStoreAdapter for multi-instance distributed shared storage.
 */

import { timingSafeEqual } from 'node:crypto';
import { recordAuditEvent, recordAuditEventAsync } from './serverAuditStore';
import { recordSecurityIncident, recordSecurityIncidentAsync } from './serverSecurityStore';
import { getAccountAdminStoreAdapter } from './serverAccountAdminAdapter';

export interface ServerUserRecord {
  id: string;
  email: string; // Normalized lowercase
  displayName: string;
  avatarSeed: string;
  avatarUrl?: string;
  provider?: string;
  passwordHash?: string;
  isVerified: boolean;
  createdAt: number;
  verifiedAt?: number;
  lastLoginAt?: number;
  // Verification Token State (hashed)
  verificationTokenHash?: string;
  verificationTokenExpiresAt?: number;
  lastVerificationSentAt?: number;
  resendAttemptsCount?: number;
  // Password Reset Token State (hashed) - P0 Feature
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: number;
  lastPasswordResetSentAt?: number;
  passwordResetAttemptsCount?: number;
  passwordChangedAt?: number;
}

const VERIFICATION_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds per resend
const MAX_RESEND_PER_WINDOW = 5; // Max 5 resends per hour

export const PASSWORD_RESET_TOKEN_TTL_MS = 20 * 60 * 1000; // 20 minutes
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000; // 60 seconds per account
export const MAX_PASSWORD_RESET_PER_WINDOW = 5; // Max 5 requests per hour

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.ENCLAVE_DATA_DIR
  ? path.resolve(process.env.ENCLAVE_DATA_DIR)
  : path.join(process.cwd(), '.enclave-data');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[ENCLAVE STORE] Could not initialize data directory:', err);
  }
}

/**
 * Loads persisted user records from disk into memory store upon initialization (development/offline).
 */
function loadPersistedUsers(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE_PATH)) {
      const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      if (raw.trim()) {
        const parsed: ServerUserRecord[] = JSON.parse(raw);
        for (const u of parsed) {
          if (u.email) {
            serverUserStore.set(u.email.toLowerCase(), u);
            serverUserIndexById.set(u.id, u.email.toLowerCase());
          }
        }
      }
    }
  } catch (err) {
    console.warn('[ENCLAVE STORE] Error reading persisted users from disk:', err);
  }
}

/**
 * Persists current user records to disk with atomic write-and-rename.
 */
export function persistUsersToDisk(): void {
  try {
    ensureDataDir();
    const data = Array.from(serverUserStore.values());
    const tempPath = `${USERS_FILE_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tempPath, USERS_FILE_PATH);
    } catch {
      // Windows / OneDrive fallback when destination file is locked by sync indexer
      fs.copyFileSync(tempPath, USERS_FILE_PATH);
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
  } catch (err) {
    console.warn('[ENCLAVE STORE] Error persisting user records to disk:', err);
  }
}

const globalForServerUsers = globalThis as unknown as {
  enclaveServerUsers?: Map<string, ServerUserRecord>; // Key: normalized email
  enclaveServerUsersById?: Map<string, string>; // Key: id -> email
};

export const serverUserStore: Map<string, ServerUserRecord> =
  globalForServerUsers.enclaveServerUsers || new Map<string, ServerUserRecord>();

export const serverUserIndexById: Map<string, string> =
  globalForServerUsers.enclaveServerUsersById || new Map<string, string>();

if (process.env.NODE_ENV !== 'production') {
  globalForServerUsers.enclaveServerUsers = serverUserStore;
  globalForServerUsers.enclaveServerUsersById = serverUserIndexById;
}

// Load on bootstrap for offline/dev
if (process.env.NODE_ENV !== 'production') {
  loadPersistedUsers();
}

import { argon2id } from 'hash-wasm';

/**
 * Computes SHA-256 hash of high-entropy verification tokens.
 * NOT for user passwords.
 */
export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(input).digest('hex');
  } catch {
    throw new Error('Cryptographic engine unavailable for SHA-256 hash.');
  }
}

/**
 * Derives Argon2id password hash with CSPRNG salt.
 * Configuration: m=64MB (65536 KiB), t=3 iterations, p=1 parallelism, 32-byte output.
 * Format: $argon2id$v=19$m=65536,t=3,p=1$<saltBase64>$<hashHex>
 */
export async function hashUserPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(salt);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(salt);
  }

  const saltBase64 = Buffer.from(salt).toString('base64');
  const hashHex = await argon2id({
    password: password.normalize('NFKC'),
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536, // 64 MB
    hashLength: 32, // 256-bit hash
    outputType: 'hex'
  });

  return `$argon2id$v=19$m=65536,t=3,p=1$${saltBase64}$${hashHex}`;
}

/**
 * Verifies a password against either an Argon2id hash or a legacy SHA-256 hash.
 * Returns { valid: boolean, needsRehash: boolean }.
 */
export async function verifyUserPassword(
  providedPassword: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!providedPassword || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  // 1. Argon2id Hash format: $argon2id$v=19$m=...,t=...,p=...$salt$hashHex
  if (storedHash.startsWith('$argon2id$')) {
    const parts = storedHash.split('$');
    // Expected parts: ['', 'argon2id', 'v=19', 'm=65536,t=3,p=1', saltBase64, hashHex]
    if (parts.length < 6) {
      return { valid: false, needsRehash: false };
    }

    const paramsPart = parts[3];
    const saltBase64 = parts[4];
    const expectedHashHex = parts[5];

    let memorySize = 65536;
    let iterations = 3;
    let parallelism = 1;

    for (const param of paramsPart.split(',')) {
      const [k, v] = param.split('=');
      if (k === 'm') memorySize = parseInt(v, 10) || memorySize;
      if (k === 't') iterations = parseInt(v, 10) || iterations;
      if (k === 'p') parallelism = parseInt(v, 10) || parallelism;
    }

    const salt = new Uint8Array(Buffer.from(saltBase64, 'base64'));
    const computedHashHex = await argon2id({
      password: providedPassword.normalize('NFKC'),
      salt,
      parallelism,
      iterations,
      memorySize,
      hashLength: 32,
      outputType: 'hex'
    });

    const expectedBuf = Buffer.from(expectedHashHex, 'hex');
    const computedBuf = Buffer.from(computedHashHex, 'hex');

    if (expectedBuf.length !== computedBuf.length) {
      return { valid: false, needsRehash: false };
    }

    const match = timingSafeEqual(expectedBuf, computedBuf);
    return { valid: match, needsRehash: false };
  }

  // 2. Legacy SHA-256 Hash format (64-character lowercase hex string)
  if (/^[0-9a-fA-F]{64}$/.test(storedHash)) {
    const computedHex = await sha256Hex(providedPassword);
    const expectedBuf = Buffer.from(storedHash.toLowerCase(), 'hex');
    const computedBuf = Buffer.from(computedHex.toLowerCase(), 'hex');

    if (expectedBuf.length !== computedBuf.length) {
      return { valid: false, needsRehash: false };
    }

    const match = timingSafeEqual(expectedBuf, computedBuf);
    return { valid: match, needsRehash: match }; // Rehash on match!
  }

  return { valid: false, needsRehash: false };
}

/**
 * Generates a high-entropy, random verification token (64 hex characters / 256 bits).
 */
export function generateVerificationToken(): string {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Registers a new user account in unverified status and issues a token (Async).
 */
export async function registerServerUserAsync(params: {
  id: string;
  email: string;
  displayName: string;
  password?: string;
  ip: string;
}): Promise<{
  success: boolean;
  user?: ServerUserRecord;
  rawToken?: string;
  error?: string;
  existingUnverified?: boolean;
}> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const adapter = getAccountAdminStoreAdapter();
  const existing = await adapter.getUserByEmail(normalizedEmail);

  if (existing) {
    if (existing.isVerified) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    // Existing unverified account: update and issue fresh verification token
    const rawToken = generateVerificationToken();
    const tokenHash = await sha256Hex(rawToken);
    const now = Date.now();

    existing.displayName = params.displayName.trim();
    if (params.password) {
      existing.passwordHash = await hashUserPassword(params.password);
    }
    existing.verificationTokenHash = tokenHash;
    existing.verificationTokenExpiresAt = now + VERIFICATION_TOKEN_TTL_MS;
    existing.lastVerificationSentAt = now;
    existing.resendAttemptsCount = (existing.resendAttemptsCount || 0) + 1;

    await adapter.saveUser(existing);
    serverUserStore.set(normalizedEmail, existing);
    serverUserIndexById.set(existing.id, normalizedEmail);

    await recordAuditEventAsync({
      adminUser: 'system',
      action: 'USER_SIGNUP_RESEND',
      target: existing.id,
      status: 'SUCCESS',
      ip: params.ip,
      metadata: { email: normalizedEmail }
    });

    if (process.env.NODE_ENV !== 'production') {
      persistUsersToDisk();
    }

    return { success: true, user: existing, rawToken, existingUnverified: true };
  }

  const rawToken = generateVerificationToken();
  const tokenHash = await sha256Hex(rawToken);
  const now = Date.now();

  const newUser: ServerUserRecord = {
    id: params.id,
    email: normalizedEmail,
    displayName: params.displayName.trim(),
    avatarSeed: params.displayName.trim(),
    passwordHash: params.password ? await hashUserPassword(params.password) : undefined,
    isVerified: false,
    createdAt: now,
    verificationTokenHash: tokenHash,
    verificationTokenExpiresAt: now + VERIFICATION_TOKEN_TTL_MS,
    lastVerificationSentAt: now,
    resendAttemptsCount: 1
  };

  const created = await adapter.createUserNX(newUser);
  if (!created) {
    // Concurrent request registered account in the same millisecond
    const raceUser = await adapter.getUserByEmail(normalizedEmail);
    if (raceUser && raceUser.isVerified) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    return { success: false, error: 'Account registration collision. Please retry.' };
  }

  serverUserStore.set(normalizedEmail, newUser);
  serverUserIndexById.set(params.id, normalizedEmail);

  if (process.env.NODE_ENV !== 'production') {
    persistUsersToDisk();
  }

  await recordAuditEventAsync({
    adminUser: 'system',
    action: 'USER_SIGNUP_UNVERIFIED',
    target: newUser.id,
    status: 'SUCCESS',
    ip: params.ip,
    metadata: { email: normalizedEmail }
  });

  return { success: true, user: newUser, rawToken };
}

/**
 * Registers a new user account (Sync facade).
 */
export async function registerServerUser(params: {
  id: string;
  email: string;
  displayName: string;
  password?: string;
  ip: string;
}): Promise<{
  success: boolean;
  user?: ServerUserRecord;
  rawToken?: string;
  error?: string;
  existingUnverified?: boolean;
}> {
  return await registerServerUserAsync(params);
}

/**
 * Verifies an account using the raw token in constant time (Async).
 */
export async function verifyServerUserTokenAsync(rawToken: string, ip: string): Promise<{
  success: boolean;
  user?: ServerUserRecord;
  error?: string;
  alreadyVerified?: boolean;
}> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 16) {
    return { success: false, error: 'Invalid verification token format.' };
  }

  const providedHash = await sha256Hex(rawToken.trim());
  const now = Date.now();
  const adapter = getAccountAdminStoreAdapter();
  const user = await adapter.findUserByTokenHash(providedHash);

  if (user) {
    if (user.isVerified) {
      return { success: true, user, alreadyVerified: true };
    }

    if (user.verificationTokenExpiresAt && now > user.verificationTokenExpiresAt) {
      user.verificationTokenHash = undefined;
      await adapter.saveUser(user);
      if (adapter.deleteUserToken) {
        await adapter.deleteUserToken(providedHash);
      }
      serverUserStore.set(user.email, user);

      await recordSecurityIncidentAsync({
        type: 'INVALID_AUTH_ATTEMPT',
        ip,
        detail: `Expired email verification token submitted for ${user.id}`,
        severity: 'LOW'
      });
      return { success: false, error: 'Verification link has expired. Please request a new verification email.' };
    }

    // Atomically mark verified and invalidate single-use token
    user.isVerified = true;
    user.verifiedAt = now;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;

    await adapter.saveUser(user);
    if (adapter.deleteUserToken) {
      await adapter.deleteUserToken(providedHash);
    }
    serverUserStore.set(user.email, user);

    if (process.env.NODE_ENV !== 'production') {
      persistUsersToDisk();
    }

    await recordAuditEventAsync({
      adminUser: 'system',
      action: 'USER_EMAIL_VERIFIED',
      target: user.id,
      status: 'SUCCESS',
      ip,
      metadata: { email: user.email }
    });

    return { success: true, user };
  }

  await recordSecurityIncidentAsync({
    type: 'INVALID_AUTH_ATTEMPT',
    ip,
    detail: 'Unrecognized verification token submitted',
    severity: 'MEDIUM'
  });

  return { success: false, error: 'Verification token not found or already consumed.' };
}

/**
 * Verifies an account using the raw token (Sync facade).
 */
export async function verifyServerUserToken(rawToken: string, ip: string): Promise<{
  success: boolean;
  user?: ServerUserRecord;
  error?: string;
  alreadyVerified?: boolean;
}> {
  return await verifyServerUserTokenAsync(rawToken, ip);
}

/**
 * Requests a new verification token with rate limiting and cooldown (Async).
 */
export async function resendVerificationEmailTokenAsync(email: string, ip: string): Promise<{
  success: boolean;
  rawToken?: string;
  user?: ServerUserRecord;
  cooldownSeconds?: number;
  error?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const adapter = getAccountAdminStoreAdapter();
  const user = await adapter.getUserByEmail(normalizedEmail);

  if (!user) {
    return {
      success: true, // Obfuscated return to prevent enumeration
      cooldownSeconds: 60
    };
  }

  if (user.isVerified) {
    return {
      success: true,
      user,
      error: 'Account is already verified. Please sign in.'
    };
  }

  const now = Date.now();

  if (user.lastVerificationSentAt && now - user.lastVerificationSentAt < RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now - user.lastVerificationSentAt)) / 1000);
    return {
      success: false,
      cooldownSeconds: remaining,
      error: `Please wait ${remaining} seconds before requesting another email.`
    };
  }

  if ((user.resendAttemptsCount || 0) >= MAX_RESEND_PER_WINDOW) {
    return {
      success: false,
      cooldownSeconds: 3600,
      error: 'Maximum verification email requests exceeded. Please try again in 1 hour or contact support.'
    };
  }

  const rawToken = generateVerificationToken();
  const tokenHash = await sha256Hex(rawToken);

  user.verificationTokenHash = tokenHash;
  user.verificationTokenExpiresAt = now + VERIFICATION_TOKEN_TTL_MS;
  user.lastVerificationSentAt = now;
  user.resendAttemptsCount = (user.resendAttemptsCount || 0) + 1;

  await adapter.saveUser(user);
  serverUserStore.set(normalizedEmail, user);

  if (process.env.NODE_ENV !== 'production') {
    persistUsersToDisk();
  }

  await recordAuditEventAsync({
    adminUser: 'system',
    action: 'USER_RESEND_VERIFICATION',
    target: user.id,
    status: 'SUCCESS',
    ip,
    metadata: { email: normalizedEmail }
  });

  return {
    success: true,
    rawToken,
    user,
    cooldownSeconds: 60
  };
}

/**
 * Requests a new verification token (Sync facade).
 */
export async function resendVerificationEmailToken(email: string, ip: string): Promise<{
  success: boolean;
  rawToken?: string;
  user?: ServerUserRecord;
  cooldownSeconds?: number;
  error?: string;
}> {
  return await resendVerificationEmailTokenAsync(email, ip);
}

/**
 * Authoritatively checks an account's verification status on the server (Async).
 */
export async function getServerUserStatusAsync(identifier: string): Promise<{
  exists: boolean;
  isVerified: boolean;
  user?: Omit<ServerUserRecord, 'passwordHash' | 'verificationTokenHash'>;
}> {
  const normalized = identifier.trim().toLowerCase();
  const adapter = getAccountAdminStoreAdapter();
  let record = await adapter.getUserByEmail(normalized);

  if (!record) {
    record = await adapter.getUserById(identifier.trim());
  }

  if (!record) {
    return { exists: false, isVerified: false };
  }

  const { passwordHash, verificationTokenHash, ...sanitized } = record;
  void passwordHash;
  void verificationTokenHash;

  return {
    exists: true,
    isVerified: record.isVerified,
    user: sanitized
  };
}

/**
 * Authoritatively checks an account's verification status on the server (Sync facade).
 */
export function getServerUserStatus(identifier: string): {
  exists: boolean;
  isVerified: boolean;
  user?: Omit<ServerUserRecord, 'passwordHash' | 'verificationTokenHash'>;
} {
  const normalized = identifier.trim().toLowerCase();
  let record = serverUserStore.get(normalized);
  if (!record && serverUserIndexById.has(identifier.trim())) {
    const email = serverUserIndexById.get(identifier.trim());
    if (email) record = serverUserStore.get(email);
  }

  if (!record) {
    return { exists: false, isVerified: false };
  }

  const { passwordHash, verificationTokenHash, ...sanitized } = record;
  void passwordHash;
  void verificationTokenHash;

  return {
    exists: true,
    isVerified: record.isVerified,
    user: sanitized
  };
}

/**
 * Authenticates a user with email and password (Async).
 */
export async function authenticateServerUserAsync(params: {
  email: string;
  password?: string;
  ip: string;
}): Promise<{
  success: boolean;
  requiresVerification?: boolean;
  user?: Omit<ServerUserRecord, 'passwordHash' | 'verificationTokenHash'>;
  error?: string;
}> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const adapter = getAccountAdminStoreAdapter();
  const user = await adapter.getUserByEmail(normalizedEmail);

  if (!user) {
    await recordSecurityIncidentAsync({
      type: 'INVALID_AUTH_ATTEMPT',
      ip: params.ip,
      detail: `Login attempt for non-existent account: ${normalizedEmail}`,
      severity: 'LOW'
    });
    return { success: false, error: 'Invalid email address or password.' };
  }

  if (user.passwordHash) {
    if (!params.password) {
      return { success: false, error: 'Password is required.' };
    }
    const { valid, needsRehash } = await verifyUserPassword(params.password, user.passwordHash);

    if (!valid) {
      await recordSecurityIncidentAsync({
        type: 'INVALID_AUTH_ATTEMPT',
        ip: params.ip,
        detail: `Failed password login for account: ${user.id}`,
        severity: 'MEDIUM'
      });
      return { success: false, error: 'Invalid email address or password.' };
    }

    // Seamless automatic migration from legacy SHA-256 to Argon2id on successful login
    if (needsRehash) {
      try {
        user.passwordHash = await hashUserPassword(params.password);
        await adapter.saveUser(user);
        serverUserStore.set(normalizedEmail, user);
        if (process.env.NODE_ENV !== 'production') {
          persistUsersToDisk();
        }
        await recordAuditEventAsync({
          adminUser: 'system',
          action: 'USER_PASSWORD_MIGRATED_ARGON2ID',
          target: user.id,
          status: 'SUCCESS',
          ip: params.ip,
          metadata: { email: normalizedEmail }
        });
      } catch (err) {
        console.warn('[ENCLAVE AUTH] Could not rehash legacy password to Argon2id:', err);
      }
    }
  }

  const { passwordHash, verificationTokenHash, ...sanitized } = user;
  void passwordHash;
  void verificationTokenHash;

  if (!user.isVerified) {
    await recordAuditEventAsync({
      adminUser: 'system',
      action: 'USER_LOGIN_BLOCKED_UNVERIFIED',
      target: user.id,
      status: 'FAILED',
      ip: params.ip,
      metadata: { email: normalizedEmail }
    });
    return {
      success: false,
      requiresVerification: true,
      user: sanitized,
      error: 'This email address has not been verified yet. Please check your inbox or request a new verification email.'
    };
  }

  user.lastLoginAt = Date.now();
  await adapter.saveUser(user);
  serverUserStore.set(normalizedEmail, user);

  if (process.env.NODE_ENV !== 'production') {
    persistUsersToDisk();
  }

  await recordAuditEventAsync({
    adminUser: 'system',
    action: 'USER_LOGIN_SUCCESS',
    target: user.id,
    status: 'SUCCESS',
    ip: params.ip,
    metadata: { email: normalizedEmail }
  });

  return {
    success: true,
    user: sanitized
  };
}

/**
 * Authenticates a user with email and password (Sync facade).
 */
export async function authenticateServerUser(params: {
  email: string;
  password?: string;
  ip: string;
}): Promise<{
  success: boolean;
  requiresVerification?: boolean;
  user?: Omit<ServerUserRecord, 'passwordHash' | 'verificationTokenHash'>;
  error?: string;
}> {
  return await authenticateServerUserAsync(params);
}

/**
 * Generates a high-entropy, random password reset token (64 hex characters / 256 bits).
 */
export function generatePasswordResetToken(): string {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Initiates a secure password reset request with rate limiting and anti-enumeration generic response.
 */
export async function requestPasswordResetTokenAsync(
  email: string,
  ip: string
): Promise<{
  success: boolean;
  rawToken?: string;
  user?: ServerUserRecord;
  cooldownSeconds?: number;
  message: string;
  error?: string;
}> {
  const genericMessage =
    'If an account exists with this email address, a password reset link has been dispatched to your inbox.';

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      success: true,
      message: genericMessage,
      cooldownSeconds: 60
    };
  }

  const adapter = getAccountAdminStoreAdapter();
  const user = await adapter.getUserByEmail(normalizedEmail);

  // Anti-enumeration: return identical success message for unknown email
  if (!user) {
    await recordAuditEventAsync({
      adminUser: 'system',
      action: 'USER_PASSWORD_RESET_UNKNOWN_EMAIL',
      target: 'unknown',
      status: 'FAILED',
      ip,
      metadata: { emailSnippet: normalizedEmail.substring(0, 3) + '***' }
    });
    return {
      success: true,
      message: genericMessage,
      cooldownSeconds: 60
    };
  }

  const now = Date.now();

  // Enforce 60-second cooldown per account
  if (user.lastPasswordResetSentAt && now - user.lastPasswordResetSentAt < PASSWORD_RESET_COOLDOWN_MS) {
    const remaining = Math.ceil((PASSWORD_RESET_COOLDOWN_MS - (now - user.lastPasswordResetSentAt)) / 1000);
    return {
      success: false,
      cooldownSeconds: remaining,
      error: `Please wait ${remaining} seconds before requesting another password reset email.`,
      message: `Please wait ${remaining} seconds before requesting another password reset email.`
    };
  }

  // Enforce hourly request limit
  if ((user.passwordResetAttemptsCount || 0) >= MAX_PASSWORD_RESET_PER_WINDOW) {
    if (user.lastPasswordResetSentAt && now - user.lastPasswordResetSentAt > 3600 * 1000) {
      user.passwordResetAttemptsCount = 0;
    } else {
      return {
        success: false,
        cooldownSeconds: 3600,
        error: 'Maximum password reset attempts exceeded. Please try again in 1 hour or contact support.',
        message: 'Maximum password reset attempts exceeded. Please try again in 1 hour or contact support.'
      };
    }
  }

  // Invalidate any previous outstanding reset token for this account
  if (user.passwordResetTokenHash && adapter.deletePasswordResetToken) {
    try {
      await adapter.deletePasswordResetToken(user.passwordResetTokenHash);
    } catch {}
  }

  // Generate cryptographically secure reset token & SHA-256 hash
  const rawToken = generatePasswordResetToken();
  const tokenHash = await sha256Hex(rawToken);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetTokenExpiresAt = now + PASSWORD_RESET_TOKEN_TTL_MS;
  user.lastPasswordResetSentAt = now;
  user.passwordResetAttemptsCount = (user.passwordResetAttemptsCount || 0) + 1;

  await adapter.saveUser(user);
  if (adapter.savePasswordResetToken) {
    try {
      await adapter.savePasswordResetToken(tokenHash, normalizedEmail, Math.ceil(PASSWORD_RESET_TOKEN_TTL_MS / 1000));
    } catch {}
  }

  serverUserStore.set(normalizedEmail, user);
  if (process.env.NODE_ENV !== 'production') {
    persistUsersToDisk();
  }

  await recordAuditEventAsync({
    adminUser: 'system',
    action: 'USER_PASSWORD_RESET_REQUESTED',
    target: user.id,
    status: 'SUCCESS',
    ip,
    metadata: { email: normalizedEmail }
  });

  return {
    success: true,
    rawToken,
    user,
    cooldownSeconds: 60,
    message: genericMessage
  };
}

/**
 * Validates a password reset token without consuming it.
 */
export async function validatePasswordResetTokenAsync(
  rawToken: string,
  ip: string
): Promise<{
  valid: boolean;
  email?: string;
  userId?: string;
  error?: string;
}> {
  if (!rawToken || typeof rawToken !== 'string' || !/^[0-9a-fA-F]{64}$/.test(rawToken.trim())) {
    return { valid: false, error: 'Invalid or malformed password reset link.' };
  }

  const tokenHash = await sha256Hex(rawToken.trim());
  const adapter = getAccountAdminStoreAdapter();
  const user = adapter.findUserByResetTokenHash ? await adapter.findUserByResetTokenHash(tokenHash) : null;

  if (!user || user.passwordResetTokenHash !== tokenHash) {
    return {
      valid: false,
      error: 'Password reset link is invalid, expired, or has already been used.'
    };
  }

  const now = Date.now();
  if (user.passwordResetTokenExpiresAt && now > user.passwordResetTokenExpiresAt) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await adapter.saveUser(user);
    if (adapter.deletePasswordResetToken) {
      try {
        await adapter.deletePasswordResetToken(tokenHash);
      } catch {}
    }
    serverUserStore.set(user.email, user);

    await recordSecurityIncidentAsync({
      type: 'INVALID_AUTH_ATTEMPT',
      ip,
      detail: `Expired password reset token submitted for ${user.id}`,
      severity: 'LOW'
    });

    return {
      valid: false,
      error: 'Password reset link has expired. Please request a new password reset.'
    };
  }

  return {
    valid: true,
    email: user.email,
    userId: user.id
  };
}

/**
 * Atomically completes password reset: hashes new password, wipes token, and updates session invalidation marker.
 */
export async function completePasswordResetAsync(params: {
  rawToken: string;
  newPassword: string;
  ip: string;
}): Promise<{
  success: boolean;
  user?: Omit<ServerUserRecord, 'passwordHash' | 'verificationTokenHash' | 'passwordResetTokenHash'>;
  error?: string;
}> {
  const { rawToken, newPassword, ip } = params;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters long.'
    };
  }

  if (!rawToken || typeof rawToken !== 'string' || !/^[0-9a-fA-F]{64}$/.test(rawToken.trim())) {
    return {
      success: false,
      error: 'Invalid or malformed password reset token.'
    };
  }

  const tokenHash = await sha256Hex(rawToken.trim());
  const adapter = getAccountAdminStoreAdapter();
  const user = adapter.findUserByResetTokenHash ? await adapter.findUserByResetTokenHash(tokenHash) : null;

  if (!user || user.passwordResetTokenHash !== tokenHash) {
    await recordSecurityIncidentAsync({
      type: 'INVALID_AUTH_ATTEMPT',
      ip,
      detail: 'Password reset attempted with invalid, consumed, or non-matching token',
      severity: 'MEDIUM'
    });
    return {
      success: false,
      error: 'Password reset token is invalid, expired, or already consumed.'
    };
  }

  const now = Date.now();
  if (user.passwordResetTokenExpiresAt && now > user.passwordResetTokenExpiresAt) {
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await adapter.saveUser(user);
    if (adapter.deletePasswordResetToken) {
      try {
        await adapter.deletePasswordResetToken(tokenHash);
      } catch {}
    }
    serverUserStore.set(user.email, user);

    await recordSecurityIncidentAsync({
      type: 'INVALID_AUTH_ATTEMPT',
      ip,
      detail: `Attempted reset with expired token for ${user.id}`,
      severity: 'LOW'
    });
    return {
      success: false,
      error: 'Password reset link has expired. Please request a new password reset.'
    };
  }

  // Atomically update password hash using Argon2id
  user.passwordHash = await hashUserPassword(newPassword);

  // Single-use token consumption & invalidation
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  user.passwordResetAttemptsCount = 0;
  user.passwordChangedAt = now;

  // Account ownership verified via email out-of-band token
  user.isVerified = true;
  if (!user.verifiedAt) {
    user.verifiedAt = now;
  }

  await adapter.saveUser(user);
  if (adapter.deletePasswordResetToken) {
    try {
      await adapter.deletePasswordResetToken(tokenHash);
    } catch {}
  }

  // Revoke all existing sessions upon password reset (P0 security invariant)
  if (adapter.revokeAllUserSessions) {
    try {
      await adapter.revokeAllUserSessions(user.id);
    } catch {}
  }

  serverUserStore.set(user.email, user);
  if (process.env.NODE_ENV !== 'production') {
    persistUsersToDisk();
  }

  await recordAuditEventAsync({
    adminUser: 'system',
    action: 'USER_PASSWORD_RESET_COMPLETED',
    target: user.id,
    status: 'SUCCESS',
    ip,
    metadata: { email: user.email }
  });

  const { passwordHash, verificationTokenHash, passwordResetTokenHash, ...sanitized } = user;
  void passwordHash;
  void verificationTokenHash;
  void passwordResetTokenHash;

  return {
    success: true,
    user: sanitized
  };
}
