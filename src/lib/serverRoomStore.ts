/**
 * ENCLAVE Server Room Store — Hardened & Adapter-Integrated V2
 * Stores ONLY public cryptographic metadata (salt, authCommitment, wrappedSecretBundle)
 * and ephemeral in-transit encrypted wire packets.
 * Zero plaintext, zero long-term retention, strict state machine, and rate limiting.
 * 
 * Powered by IRoomStoreAdapter:
 * - Development: InMemoryRoomStoreAdapter (local Map, survives HMR).
 * - Production: DistributedRoomStoreAdapter (Redis / Upstash REST with strict TTLs).
 * - Exposes both async adapter methods and backward-compatible synchronous facade
 *   for existing in-process tests and zero-regression interoperability.
 */

import type { RoomMeta, WirePacket, WrappedSecretBundle, RoomLifecycleState } from '@/packages/protocol';
import { timingSafeEqual } from '@/packages/crypto';
import {
  type IRoomStoreAdapter,
  type ServerRoomRecord,
  type EncryptedMediaRecord,
  type ParticipantPublicSummary,
  type PresenceUpdateResult,
  type RateLimitCheckResult,
  InMemoryRoomStoreAdapter,
  DistributedRoomStoreAdapter,
  getRoomStoreAdapter,
  setRoomStoreAdapter,
  WAITING_INACTIVITY_LIMIT_MS,
  WAITING_WARNING_THRESHOLD_MS
} from './serverRoomAdapter';

export type { EncryptedMediaRecord, ServerRoomRecord, ParticipantPublicSummary, PresenceUpdateResult, RateLimitCheckResult };
export { WAITING_INACTIVITY_LIMIT_MS, WAITING_WARNING_THRESHOLD_MS };

// Shared in-memory Map exposed for backward compatibility with existing tests and local inspection
const globalForRooms = globalThis as unknown as {
  enclaveRoomStore?: Map<string, ServerRoomRecord>;
  enclaveRateLimitStore?: Map<string, { attempts: number; lastAttempt: number; lockedUntil: number }>;
  enclaveReaperStarted?: boolean;
};

export const roomStore: Map<string, ServerRoomRecord> =
  globalForRooms.enclaveRoomStore || new Map<string, ServerRoomRecord>();

export const rateLimitStore =
  globalForRooms.enclaveRateLimitStore || new Map<string, { attempts: number; lastAttempt: number; lockedUntil: number }>();

if (process.env.NODE_ENV !== 'production') {
  globalForRooms.enclaveRoomStore = roomStore;
  globalForRooms.enclaveRateLimitStore = rateLimitStore;
}

const MAX_RATE_LIMIT_ENTRIES = 5000;

export function getRateLimitStats(): { totalTracked: number; activeLockouts: number } {
  const now = Date.now();
  let lockouts = 0;
  for (const record of rateLimitStore.values()) {
    if (record.lockedUntil > now) {
      lockouts++;
    }
  }
  return { totalTracked: rateLimitStore.size, activeLockouts: lockouts };
}

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
 */
export function getTrustedClientIp(request: Request): string {
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp && isValidIp(vercelIp.trim())) {
    return vercelIp.trim();
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

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
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

/**
 * Verifies if provided auth commitment matches server record in constant-time.
 */
export async function verifyRoomAuthAsync(
  roomId: string,
  providedCommitment?: string | null
): Promise<boolean> {
  if (!providedCommitment || typeof providedCommitment !== 'string') {
    return false;
  }
  const adapter = getRoomStoreAdapter();
  const record = await adapter.getRoom(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return false;
  }
  return timingSafeEqual(record.meta.authCommitment, providedCommitment.trim());
}

export function verifyRoomAuth(roomId: string, providedCommitment?: string | null): boolean {
  if (!providedCommitment || typeof providedCommitment !== 'string') {
    return false;
  }
  const adapter = getRoomStoreAdapter();
  const record = adapter.isDistributed
    ? roomStore.get(roomId)
    : (adapter as InMemoryRoomStoreAdapter).getRoom(roomId);
  if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
    return false;
  }
  return timingSafeEqual(record.meta.authCommitment, providedCommitment.trim());
}

/**
 * Rate Limiting Operations — Adapter Backed
 */
export async function checkRateLimitAsync(clientKey: string): Promise<RateLimitCheckResult> {
  return await getRoomStoreAdapter().checkRateLimit(clientKey);
}

export function checkRateLimit(clientKey: string): RateLimitCheckResult {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    // Synchronous fallback for local callers
    const now = Date.now();
    const record = rateLimitStore.get(clientKey);
    if (!record) return { allowed: true };
    if (record.lockedUntil > now) {
      return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
    }
    if (now - record.lastAttempt > 300000) {
      rateLimitStore.delete(clientKey);
      return { allowed: true };
    }
    if (record.attempts >= 5) {
      record.lockedUntil = now + 300000;
      return { allowed: false, retryAfter: 300 };
    }
    return { allowed: true };
  }
  return (adapter as InMemoryRoomStoreAdapter).checkRateLimit(clientKey);
}

export async function recordFailedAttemptAsync(clientKey: string): Promise<void> {
  await getRoomStoreAdapter().recordFailedAttempt(clientKey);
}

export function recordFailedAttempt(clientKey: string): void {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
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
    return;
  }
  (adapter as InMemoryRoomStoreAdapter).recordFailedAttempt(clientKey);
}

export async function resetRateLimitAsync(clientKey: string): Promise<void> {
  await getRoomStoreAdapter().resetRateLimit(clientKey);
}

export function resetRateLimit(clientKey: string): void {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    rateLimitStore.delete(clientKey);
    return;
  }
  (adapter as InMemoryRoomStoreAdapter).resetRateLimit(clientKey);
}

/**
 * Creates a new room record on the server.
 */
export async function createServerRoomAsync(
  roomId: string,
  salt: string,
  authCommitment: string,
  wrappedSecretBundle: WrappedSecretBundle,
  oneTimeAccess = false,
  requirePass = true,
  accessMode: 'with_pass' | 'without_pass' = requirePass ? 'with_pass' : 'without_pass',
  creatorId?: string
): Promise<RoomMeta> {
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

  const record: ServerRoomRecord = {
    meta,
    activeSockets: new Set(),
    participantHeartbeats: new Map(),
    participantInfo: new Map(),
    recentPackets: [],
    encryptedMedia: new Map(),
    lastActivity: Date.now()
  };

  const adapter = getRoomStoreAdapter();
  await adapter.createRoom(roomId, record);

  // Synchronize local Map for backward compatibility
  roomStore.set(roomId, record);
  return meta;
}

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

  const record: ServerRoomRecord = {
    meta,
    activeSockets: new Set(),
    participantHeartbeats: new Map(),
    participantInfo: new Map(),
    recentPackets: [],
    encryptedMedia: new Map(),
    lastActivity: Date.now()
  };

  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    // Fire promise in background, preserve local map synchronously
    void adapter.createRoom(roomId, record);
  } else {
    (adapter as InMemoryRoomStoreAdapter).createRoom(roomId, record);
  }

  roomStore.set(roomId, record);
  return meta;
}

/**
 * Gets public metadata for a room.
 */
export async function getServerRoomAsync(roomId: string): Promise<RoomMeta | null> {
  const adapter = getRoomStoreAdapter();
  const record = await adapter.getRoom(roomId);
  if (!record) return null;
  return {
    ...record.meta,
    lastActivity: record.lastActivity,
    inactivityLimitMs: WAITING_INACTIVITY_LIMIT_MS,
    warningThresholdMs: WAITING_WARNING_THRESHOLD_MS,
    serverTime: Date.now()
  };
}

export function getServerRoom(roomId: string): RoomMeta | null {
  const adapter = getRoomStoreAdapter();
  const record = adapter.isDistributed
    ? roomStore.get(roomId)
    : (adapter as InMemoryRoomStoreAdapter).getRoom(roomId);
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
 * Updates presence for a participant with atomic state machine transitions.
 */
export async function updateRoomPresenceAsync(
  roomId: string,
  participantId: string,
  action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
  displayName?: string
): Promise<PresenceUpdateResult | null> {
  const adapter = getRoomStoreAdapter();
  const res = await adapter.updatePresence(roomId, participantId, action, displayName);
  if (res && !adapter.isDistributed) {
    // keep local roomStore in sync
    const record = (adapter as InMemoryRoomStoreAdapter).getRoom(roomId);
    if (record) roomStore.set(roomId, record);
    else if (res.state === 'DESTROYED') roomStore.delete(roomId);
  }
  return res;
}

export function updateRoomPresence(
  roomId: string,
  participantId: string,
  action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
  displayName?: string
): PresenceUpdateResult | null {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    // Local fallback for synchronous callers
    const localAdapter = new InMemoryRoomStoreAdapter(roomStore);
    return localAdapter.updatePresence(roomId, participantId, action, displayName);
  }
  return (adapter as InMemoryRoomStoreAdapter).updatePresence(
    roomId,
    participantId,
    action,
    displayName
  );
}

/**
 * Destroys a room permanently.
 */
export async function destroyServerRoomAsync(roomId: string, reason = 'Dissolved'): Promise<void> {
  const adapter = getRoomStoreAdapter();
  await adapter.deleteRoom(roomId, reason);
  const localRecord = roomStore.get(roomId);
  if (localRecord) {
    localRecord.meta.state = 'DESTROYED';
    localRecord.activeSockets.clear();
    localRecord.participantHeartbeats.clear();
    localRecord.participantInfo.clear();
    localRecord.recentPackets = [];
    localRecord.encryptedMedia.clear();
  }
}

export function destroyServerRoom(roomId: string, reason = 'Dissolved'): void {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    void adapter.deleteRoom(roomId, reason);
  } else {
    (adapter as InMemoryRoomStoreAdapter).deleteRoom(roomId, reason);
  }

  const record = roomStore.get(roomId);
  if (record) {
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
}

/**
 * Stores encrypted media in blind store.
 */
export async function storeEncryptedMediaAsync(
  roomId: string,
  media: { mediaId: string; ciphertext: string; iv: string; mimeType: string; size: number }
): Promise<boolean> {
  const adapter = getRoomStoreAdapter();
  const record: EncryptedMediaRecord = { ...media, timestamp: Date.now() };
  const res = await adapter.storeMedia(roomId, record);
  if (res) {
    const local = roomStore.get(roomId);
    if (local) local.encryptedMedia.set(media.mediaId, record);
  }
  return res;
}

export function storeEncryptedMedia(
  roomId: string,
  media: { mediaId: string; ciphertext: string; iv: string; mimeType: string; size: number }
): boolean {
  const adapter = getRoomStoreAdapter();
  const record: EncryptedMediaRecord = { ...media, timestamp: Date.now() };
  if (adapter.isDistributed) {
    void adapter.storeMedia(roomId, record);
    const local = roomStore.get(roomId);
    if (local) local.encryptedMedia.set(media.mediaId, record);
    return true;
  }
  return (adapter as InMemoryRoomStoreAdapter).storeMedia(roomId, record);
}

/**
 * Retrieves encrypted media payload from blind store.
 */
export async function getEncryptedMediaAsync(
  roomId: string,
  mediaId: string
): Promise<EncryptedMediaRecord | null> {
  return await getRoomStoreAdapter().getMedia(roomId, mediaId);
}

export function getEncryptedMedia(roomId: string, mediaId: string): EncryptedMediaRecord | null {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    const local = roomStore.get(roomId);
    return local?.encryptedMedia.get(mediaId) || null;
  }
  return (adapter as InMemoryRoomStoreAdapter).getMedia(roomId, mediaId);
}

/**
 * Relays an encrypted wire packet.
 */
export async function pushEncryptedPacketAsync(roomId: string, packet: WirePacket): Promise<boolean> {
  const adapter = getRoomStoreAdapter();
  const res = await adapter.pushPacket(roomId, packet);
  if (res && adapter.isDistributed) {
    const local = roomStore.get(roomId);
    if (local) {
      local.recentPackets.push(packet);
      if (local.recentPackets.length > 50) local.recentPackets.shift();
    }
  }
  return res;
}

export function pushEncryptedPacket(roomId: string, packet: WirePacket): boolean {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    void adapter.pushPacket(roomId, packet);
    const local = roomStore.get(roomId);
    if (local) {
      local.recentPackets.push(packet);
      if (local.recentPackets.length > 50) local.recentPackets.shift();
    }
    return true;
  }
  return (adapter as InMemoryRoomStoreAdapter).pushPacket(roomId, packet);
}

/**
 * Fetches recent encrypted packets (transient buffer).
 */
export async function getEncryptedPacketsAsync(
  roomId: string,
  sinceTimestamp = 0,
  afterCursor?: number
): Promise<WirePacket[]> {
  return await getRoomStoreAdapter().getPackets(roomId, sinceTimestamp, afterCursor);
}

export function getEncryptedPackets(
  roomId: string,
  sinceTimestamp = 0,
  afterCursor?: number
): WirePacket[] {
  const adapter = getRoomStoreAdapter();
  if (adapter.isDistributed) {
    const local = roomStore.get(roomId);
    if (!local) return [];
    return local.recentPackets.filter((p) => {
      if (afterCursor !== undefined && typeof afterCursor === 'number' && !isNaN(afterCursor)) {
        if (p.relaySeq !== undefined) return p.relaySeq > afterCursor;
        return p.timestamp > sinceTimestamp;
      }
      return p.timestamp > sinceTimestamp;
    });
  }
  return (adapter as InMemoryRoomStoreAdapter).getPackets(roomId, sinceTimestamp, afterCursor);
}

function startRoomReaper() {
  if (globalForRooms.enclaveReaperStarted) return;
  globalForRooms.enclaveReaperStarted = true;

  const timer = setInterval(async () => {
    try {
      const adapter = getRoomStoreAdapter();
      await adapter.reapExpiredRooms(Date.now());
    } catch {
      // Background reaper safety
    }
  }, 10000);
  if (timer.unref) {
    timer.unref();
  }
}

startRoomReaper();
