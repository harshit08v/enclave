/**
 * ENCLAVE In-Memory Server Room Store — Hardened V1
 * Stores ONLY public cryptographic metadata (salt, authCommitment, wrappedSecretBundle)
 * and ephemeral in-transit encrypted wire packets.
 * Zero plaintext, zero long-term retention, strict state machine and rate limiting.
 */

import type { RoomMeta, WirePacket, WrappedSecretBundle, RoomLifecycleState } from '@/packages/protocol';
import { timingSafeEqual } from '@/packages/crypto';

export interface EncryptedMediaRecord {
  mediaId: string;
  ciphertext: string;
  iv: string;
  mimeType: string;
  size: number;
  timestamp: number;
}

export interface ServerRoomRecord {
  meta: RoomMeta;
  activeSockets: Set<string>;
  participantHeartbeats: Map<string, number>;
  participantInfo: Map<string, { id: string; displayName: string; joinedAt: number }>;
  recentPackets: WirePacket[];
  encryptedMedia: Map<string, EncryptedMediaRecord>;
  lastActivity: number;
}

// Rate Limiting Store: Track failed attempts per IP/Room
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const MAX_RATE_LIMIT_ENTRIES = 5000;

export function cleanupExpiredRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastAttempt > 300000 && record.lockedUntil < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Validates whether an IP string is a syntactically valid IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();

  // IPv4 validation: 4 numeric octets 0-255 without leading zeroes
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(trimmed);
  if (ipv4Match) {
    for (let i = 1; i <= 4; i++) {
      const num = Number(ipv4Match[i]);
      if (num < 0 || num > 255) return false;
      if (ipv4Match[i].length > 1 && ipv4Match[i].startsWith('0')) return false;
    }
    return true;
  }

  // IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:([0-9a-fA-F]{1,4}:){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(trimmed);
}

/**
 * Extracts a trusted client IP address from request headers in strict precedence order.
 * Priority: Vercel / Cloudflare edge headers -> X-Real-IP -> sanitized X-Forwarded-For -> 127.0.0.1 fallback.
 * Prevents header spoofing attacks from forging arbitrary strings to bypass rate limits.
 */
export function getTrustedClientIp(request: Request): string {
  // 1. Vercel trusted edge header
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp && isValidIp(vercelIp.trim())) {
    return vercelIp.trim();
  }

  // 2. Cloudflare connecting IP
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 3. Reverse proxy X-Real-IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 4. X-Forwarded-For (extract and validate leftmost client IP)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }

  return '127.0.0.1';
}

/**
 * Extracts auth commitment token / bearer credential from Authorization or custom header.
 */
export function extractAuthProof(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }
  const customHeader = request.headers.get('x-enclave-auth-commitment');
  if (customHeader) {
    return customHeader.trim();
  }
  return null;
}

// Global in-memory store (survives dev HMR)
const globalForRooms = globalThis as unknown as {
  enclaveRoomStore?: Map<string, ServerRoomRecord>;
  enclaveReaperStarted?: boolean;
};

export const roomStore = globalForRooms.enclaveRoomStore || new Map<string, ServerRoomRecord>();
if (process.env.NODE_ENV !== 'production') globalForRooms.enclaveRoomStore = roomStore;

/**
 * Checks rate limiting for a client key (IP + Room).
 * Max 5 attempts per 5 minutes; locks for 5 minutes if exceeded.
 */
export function checkRateLimit(clientKey: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientKey);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Reset window if last attempt was > 5 minutes ago
  if (now - record.lastAttempt > 300000) {
    rateLimitStore.delete(clientKey);
    return { allowed: true };
  }

  if (record.attempts >= 5) {
    record.lockedUntil = now + 300000; // 5 min lockout
    return { allowed: false, retryAfter: 300 };
  }

  return { allowed: true };
}

/**
 * Records a failed verification attempt.
 */
export function recordFailedAttempt(clientKey: string): void {
  const now = Date.now();
  if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
    cleanupExpiredRateLimits();
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitStore.keys().next().value;
      if (oldestKey) rateLimitStore.delete(oldestKey);
    }
  }
  const record = rateLimitStore.get(clientKey) || { attempts: 0, lastAttempt: now, lockedUntil: 0 };
  record.attempts += 1;
  record.lastAttempt = now;
  rateLimitStore.set(clientKey, record);
}

/**
 * Resets rate limit upon successful verification.
 */
export function resetRateLimit(clientKey: string): void {
  rateLimitStore.delete(clientKey);
}

export const WAITING_INACTIVITY_LIMIT_MS = 180000; // 3 minutes total waiting idle limit
export const WAITING_WARNING_THRESHOLD_MS = 120000; // Warning active in last 2 minutes

/**
 * Creates a new room record on the server.
 */
export function createServerRoom(
  roomId: string,
  salt: string,
  authCommitment: string,
  wrappedSecretBundle: WrappedSecretBundle,
  oneTimeAccess = false,
  requirePass = true,
  accessMode: 'with_pass' | 'without_pass' = requirePass ? 'with_pass' : 'without_pass',
  creatorId?: string
): RoomMeta {
  const meta: RoomMeta = {
    id: roomId,
    salt,
    authCommitment,
    wrappedSecretBundle,
    createdAt: Date.now(),
    oneTimeAccess,
    participantCount: 0,
    state: 'CREATED',
    accessCount: 0,
    requirePass,
    accessMode,
    creatorId,
    lastActivity: Date.now(),
    inactivityLimitMs: WAITING_INACTIVITY_LIMIT_MS,
    warningThresholdMs: WAITING_WARNING_THRESHOLD_MS,
    serverTime: Date.now()
  };

  roomStore.set(roomId, {
    meta,
    activeSockets: new Set(),
    participantHeartbeats: new Map(),
    participantInfo: new Map(),
    recentPackets: [],
    encryptedMedia: new Map(),
    lastActivity: Date.now()
  });

  return meta;
}

/**
 * Gets public metadata for a room.
 */
export function getServerRoom(roomId: string): RoomMeta | null {
  const record = roomStore.get(roomId);
  if (!record) return null;
  return {
    ...record.meta,
    lastActivity: record.lastActivity,
    inactivityLimitMs: WAITING_INACTIVITY_LIMIT_MS,
    warningThresholdMs: WAITING_WARNING_THRESHOLD_MS,
    serverTime: Date.now()
  };
}

/**
 * Verifies if provided auth commitment matches server record in constant-time.
 */
export function verifyRoomAuth(roomId: string, providedCommitment?: string | null): boolean {
  if (!providedCommitment || typeof providedCommitment !== 'string') {
    return false;
  }
  const record = roomStore.get(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return false;
  }
  return timingSafeEqual(record.meta.authCommitment, providedCommitment.trim());
}

export interface ParticipantPublicSummary {
  id: string;
  displayName: string;
  joinedAt: number;
}

/**
 * Updates presence for a participant with atomic state machine transitions.
 */
export function updateRoomPresence(
  roomId: string,
  participantId: string,
  action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
  displayName?: string
): {
  state: RoomLifecycleState;
  participantCount: number;
  participants: ParticipantPublicSummary[];
  lastActivity?: number;
} | null {
  const record = roomStore.get(roomId);
  if (!record) return null;

  // Invariant: Once DESTROYING or DESTROYED, reject all actions
  if (record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return { state: 'DESTROYED', participantCount: 0, participants: [], lastActivity: record.lastActivity };
  }

  const now = Date.now();
  record.lastActivity = now;

  if (action === 'join') {
    if (record.meta.oneTimeAccess && record.meta.accessCount >= 2 && !record.activeSockets.has(participantId)) {
      return null;
    }

    record.activeSockets.add(participantId);
    record.participantHeartbeats.set(participantId, now);

    const existingInfo = record.participantInfo.get(participantId);
    record.participantInfo.set(participantId, {
      id: participantId,
      displayName: displayName || existingInfo?.displayName || 'Anonymous',
      joinedAt: existingInfo?.joinedAt || now
    });

    record.meta.accessCount += 1;
    record.meta.participantCount = record.activeSockets.size;

    if (record.meta.participantCount === 1) {
      record.meta.state = 'WAITING';
    } else if (record.meta.participantCount >= 2) {
      record.meta.state = 'ACTIVE';
    }
  } else if (action === 'heartbeat' || action === 'im_here') {
    record.activeSockets.add(participantId);
    record.participantHeartbeats.set(participantId, now);

    if (!record.participantInfo.has(participantId)) {
      record.participantInfo.set(participantId, {
        id: participantId,
        displayName: displayName || 'Anonymous',
        joinedAt: now
      });
    } else if (displayName) {
      const existing = record.participantInfo.get(participantId)!;
      existing.displayName = displayName;
    }

    record.meta.participantCount = record.activeSockets.size;
    if (record.meta.participantCount >= 2 && record.meta.state === 'WAITING') {
      record.meta.state = 'ACTIVE';
    }
  } else if (action === 'leave') {
    record.activeSockets.delete(participantId);
    record.participantHeartbeats.delete(participantId);
    record.participantInfo.delete(participantId);
    record.meta.participantCount = record.activeSockets.size;

    if (record.meta.participantCount === 0) {
      destroyServerRoom(roomId, 'All participants exited');
      return { state: 'DESTROYED', participantCount: 0, participants: [], lastActivity: now };
    } else if (record.meta.participantCount === 1) {
      record.meta.state = 'ENDING';
    }
  } else if (action === 'destroy') {
    destroyServerRoom(roomId, 'Manual destruction triggered');
    return { state: 'DESTROYED', participantCount: 0, participants: [], lastActivity: now };
  }

  const participants = Array.from(record.participantInfo.values());
  return {
    state: record.meta.state,
    participantCount: record.meta.participantCount,
    participants,
    lastActivity: record.lastActivity
  };
}

/**
 * Destroys a room permanently. Wipes packets, media, and active socket references immediately.
 */
export function destroyServerRoom(roomId: string, reason = 'Dissolved'): void {
  const record = roomStore.get(roomId);
  if (!record) return;

  record.meta.state = 'DESTROYING';
  record.meta.destroyedAt = Date.now();
  record.meta.participantCount = 0;
  record.activeSockets.clear();
  record.participantHeartbeats.clear();
  record.participantInfo.clear();
  record.recentPackets = [];
  record.encryptedMedia.clear();

  record.meta.state = 'DESTROYED';

  setTimeout(() => {
    roomStore.delete(roomId);
  }, 30000);
}

/**
 * Stores encrypted media in blind memory store.
 */
export function storeEncryptedMedia(
  roomId: string,
  media: { mediaId: string; ciphertext: string; iv: string; mimeType: string; size: number }
): boolean {
  const record = roomStore.get(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return false;
  }

  record.lastActivity = Date.now();
  record.encryptedMedia.set(media.mediaId, {
    ...media,
    timestamp: Date.now()
  });

  return true;
}

/**
 * Retrieves encrypted media payload from blind memory store.
 */
export function getEncryptedMedia(roomId: string, mediaId: string): EncryptedMediaRecord | null {
  const record = roomStore.get(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return null;
  }
  return record.encryptedMedia.get(mediaId) || null;
}

/**
 * Relays an encrypted wire packet.
 */
export function pushEncryptedPacket(roomId: string, packet: WirePacket): boolean {
  const record = roomStore.get(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return false;
  }

  record.lastActivity = Date.now();
  record.recentPackets.push(packet);

  if (record.recentPackets.length > 50) {
    record.recentPackets.shift();
  }

  return true;
}

/**
 * Fetches recent encrypted packets (transient buffer).
 */
export function getEncryptedPackets(roomId: string, sinceTimestamp = 0): WirePacket[] {
  const record = roomStore.get(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return [];
  }
  return record.recentPackets.filter(p => p.timestamp > sinceTimestamp);
}

function startRoomReaper() {
  if (globalForRooms.enclaveReaperStarted) return;
  globalForRooms.enclaveReaperStarted = true;

  setInterval(() => {
    const now = Date.now();
    for (const [roomId, record] of roomStore.entries()) {
      for (const [participantId, lastHb] of record.participantHeartbeats.entries()) {
        if (now - lastHb > 25000) {
          record.activeSockets.delete(participantId);
          record.participantHeartbeats.delete(participantId);
          record.participantInfo.delete(participantId);
        }
      }
      record.meta.participantCount = record.activeSockets.size;

      const isWaitingIdle = record.meta.state === 'WAITING' && (now - record.lastActivity > WAITING_INACTIVITY_LIMIT_MS);
      const isIdle = now - record.lastActivity > 900000;
      const isAbandoned = record.meta.state === 'CREATED' && now - record.meta.createdAt > 600000;

      if (isWaitingIdle || isIdle || isAbandoned) {
        destroyServerRoom(roomId, isWaitingIdle ? 'Waiting room inactivity timeout' : 'Idle room reap');
      }
    }
  }, 10000);
}

startRoomReaper();
