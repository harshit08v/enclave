/**
 * ENCLAVE Ephemeral Room Store Adapter Interface & Implementations
 * 
 * Provides an explicit storage abstraction layer:
 * - IRoomStoreAdapter: Comprehensive contract supporting atomic lifecycle, presence,
 *   ordered packet relay, segregated media storage, TTL bounds, rate limiting, and room destruction.
 * - InMemoryRoomStoreAdapter: Single-process reference implementation with in-memory maps.
 * - DistributedRoomStoreAdapter: Production-grade Redis / Upstash REST implementation.
 * - Runtime adapter selection via getRoomStoreAdapter(): In development, defaults to InMemory;
 *   In production, fails closed if Redis configuration is absent or invalid.
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

export interface ParticipantPublicSummary {
  id: string;
  displayName: string;
  joinedAt: number;
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

export interface PresenceUpdateResult {
  state: RoomLifecycleState;
  participantCount: number;
  participants: ParticipantPublicSummary[];
  lastActivity: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface IRoomStoreAdapter {
  readonly adapterName: string;
  readonly isDistributed: boolean;

  // Lifecycle
  createRoom(roomId: string, record: ServerRoomRecord): Promise<boolean> | boolean;
  getRoom(roomId: string): Promise<ServerRoomRecord | null> | ServerRoomRecord | null;
  hasRoom(roomId: string): Promise<boolean> | boolean;
  deleteRoom(roomId: string, reason?: string): Promise<void> | void;
  listRooms(): Promise<[string, ServerRoomRecord][]> | [string, ServerRoomRecord][];

  // Presence & State Machine
  updatePresence(
    roomId: string,
    participantId: string,
    action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
    displayName?: string
  ): Promise<PresenceUpdateResult | null> | PresenceUpdateResult | null;

  // Inactivity / Expired Reap
  reapExpiredRooms(now?: number): Promise<{ reapedRooms: number }> | { reapedRooms: number };

  // Packet Relay
  pushPacket(roomId: string, packet: WirePacket): Promise<boolean> | boolean;
  getPackets(roomId: string, sinceTimestamp?: number, afterCursor?: number): Promise<WirePacket[]> | WirePacket[];

  // Segregated Media Storage
  storeMedia(roomId: string, media: EncryptedMediaRecord): Promise<boolean> | boolean;
  getMedia(roomId: string, mediaId: string): Promise<EncryptedMediaRecord | null> | EncryptedMediaRecord | null;
  consumeMedia(roomId: string, mediaId: string): Promise<boolean> | boolean;

  // Rate Limiting
  checkRateLimit(clientKey: string): Promise<RateLimitCheckResult> | RateLimitCheckResult;
  recordFailedAttempt(clientKey: string): Promise<void> | void;
  resetRateLimit(clientKey: string): Promise<void> | void;
}

export const WAITING_INACTIVITY_LIMIT_MS = 180000; // 3 minutes total waiting idle limit
export const WAITING_WARNING_THRESHOLD_MS = 120000; // Warning active in last 2 minutes
export const HARD_ROOM_TTL_SECONDS = 3600; // 1 hour hard maximum TTL
export const MEDIA_TTL_SECONDS = 3600; // 1 hour hard media TTL
export const RATE_LIMIT_LOCKOUT_SECONDS = 300; // 5 minutes lockout

interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

/**
 * Single-process In-Memory Room Store Adapter.
 * Backed by process-memory Map (survives dev HMR).
 */
export class InMemoryRoomStoreAdapter implements IRoomStoreAdapter {
  readonly adapterName = 'InMemoryRoomStoreAdapter';
  readonly isDistributed = false;
  private readonly store: Map<string, ServerRoomRecord>;
  private readonly rateLimits: Map<string, RateLimitRecord>;
  private readonly roomSequences: Map<string, number>;

  constructor(
    sharedMap?: Map<string, ServerRoomRecord>,
    sharedRateLimits?: Map<string, RateLimitRecord>,
    sharedSequences?: Map<string, number>
  ) {
    this.store = sharedMap || new Map<string, ServerRoomRecord>();
    this.rateLimits = sharedRateLimits || new Map<string, RateLimitRecord>();
    this.roomSequences = sharedSequences || new Map<string, number>();
  }

  get rawMap(): Map<string, ServerRoomRecord> {
    return this.store;
  }

  get rawRateLimits(): Map<string, RateLimitRecord> {
    return this.rateLimits;
  }

  createRoom(roomId: string, record: ServerRoomRecord): boolean {
    if (this.store.has(roomId)) {
      const existing = this.store.get(roomId);
      if (existing && existing.meta.state !== 'DESTROYED') {
        return false;
      }
    }
    this.store.set(roomId, record);
    return true;
  }

  getRoom(roomId: string): ServerRoomRecord | null {
    return this.store.get(roomId) || null;
  }

  hasRoom(roomId: string): boolean {
    const room = this.store.get(roomId);
    return Boolean(room && room.meta.state !== 'DESTROYING' && room.meta.state !== 'DESTROYED');
  }

  deleteRoom(roomId: string, _reason = 'Dissolved'): void {
    const record = this.store.get(roomId);
    if (!record) return;

    if (record.meta) {
      record.meta.state = 'DESTROYING';
      record.meta.destroyedAt = Date.now();
      record.meta.participantCount = 0;
    }
    if (record.activeSockets) record.activeSockets.clear();
    if (record.participantHeartbeats) record.participantHeartbeats.clear();
    if (record.participantInfo) record.participantInfo.clear();
    record.recentPackets = [];
    if (record.encryptedMedia) record.encryptedMedia.clear();
    if (record.meta) {
      record.meta.state = 'DESTROYED';
    }
    this.roomSequences.delete(roomId);

    setTimeout(() => {
      this.store.delete(roomId);
    }, 30000);
  }

  listRooms(): [string, ServerRoomRecord][] {
    return Array.from(this.store.entries());
  }

  updatePresence(
    roomId: string,
    participantId: string,
    action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
    displayName?: string
  ): PresenceUpdateResult | null {
    const record = this.store.get(roomId);
    if (!record) return null;

    if (record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return {
        state: 'DESTROYED',
        participantCount: 0,
        participants: [],
        lastActivity: record.lastActivity
      };
    }

    const now = Date.now();
    record.lastActivity = now;

    if (action === 'join') {
      if (
        record.meta.oneTimeAccess &&
        record.meta.accessCount >= 2 &&
        !record.activeSockets.has(participantId)
      ) {
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
        this.deleteRoom(roomId, 'All participants exited');
        return {
          state: 'DESTROYED',
          participantCount: 0,
          participants: [],
          lastActivity: now
        };
      } else if (record.meta.participantCount === 1) {
        record.meta.state = 'ENDING';
      }
    } else if (action === 'destroy') {
      this.deleteRoom(roomId, 'Manual destruction triggered');
      return {
        state: 'DESTROYED',
        participantCount: 0,
        participants: [],
        lastActivity: now
      };
    }

    const participants = Array.from(record.participantInfo.values());
    return {
      state: record.meta.state,
      participantCount: record.meta.participantCount,
      participants,
      lastActivity: record.lastActivity
    };
  }

  reapExpiredRooms(now = Date.now()): { reapedRooms: number } {
    let reaped = 0;
    for (const [roomId, record] of this.store.entries()) {
      for (const [participantId, lastHb] of record.participantHeartbeats.entries()) {
        if (now - lastHb > 25000) {
          record.activeSockets.delete(participantId);
          record.participantHeartbeats.delete(participantId);
          record.participantInfo.delete(participantId);
        }
      }
      record.meta.participantCount = record.activeSockets.size;

      const isWaitingIdle =
        record.meta.state === 'WAITING' &&
        now - record.lastActivity > WAITING_INACTIVITY_LIMIT_MS;
      const isIdle = now - record.lastActivity > 900000;
      const isAbandoned =
        record.meta.state === 'CREATED' && now - record.meta.createdAt > 600000;

      if (isWaitingIdle || isIdle || isAbandoned) {
        this.deleteRoom(
          roomId,
          isWaitingIdle ? 'Waiting room inactivity timeout' : 'Idle room reap'
        );
        reaped++;
      }
    }
    return { reapedRooms: reaped };
  }

  pushPacket(roomId: string, packet: WirePacket): boolean {
    const record = this.store.get(roomId);
    if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return false;
    }
    const now = Date.now();
    // Drop packet if already expired
    if (packet.expiresAt && packet.expiresAt <= now) {
      return false;
    }

    // Handle room-wide disappearing timer policy update
    if (packet.type === 'disappearing_timer_update' && packet.disappearingTimerSec !== undefined) {
      record.meta.disappearingTimerSec = packet.disappearingTimerSec;
    }

    // If room has active disappearing timer and packet lacks explicit expiresAt, stamp server-side
    let packetToStore = packet;
    if (record.meta.disappearingTimerSec && record.meta.disappearingTimerSec > 0 && !packet.expiresAt) {
      packetToStore = {
        ...packet,
        ttlSeconds: record.meta.disappearingTimerSec,
        expiresAt: now + record.meta.disappearingTimerSec * 1000
      };
    }

    record.lastActivity = now;
    const nextSeq = (this.roomSequences.get(roomId) || 0) + 1;
    this.roomSequences.set(roomId, nextSeq);

    // Attach server delivery cursor without mutating sender's timestamp or authenticated payload
    const packetWithRelaySeq: WirePacket = {
      ...packetToStore,
      relaySeq: nextSeq
    };

    record.recentPackets.push(packetWithRelaySeq);
    if (record.recentPackets.length > 50) {
      record.recentPackets.shift();
    }
    return true;
  }

  getPackets(roomId: string, sinceTimestamp = 0, afterCursor?: number): WirePacket[] {
    const record = this.store.get(roomId);
    if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return [];
    }
    const now = Date.now();
    // Prune expired packets from in-memory store so they can never be retrieved or replayed
    record.recentPackets = record.recentPackets.filter((p) => !p.expiresAt || p.expiresAt > now);

    return record.recentPackets.filter((p) => {
      if (afterCursor !== undefined && typeof afterCursor === 'number' && !isNaN(afterCursor)) {
        if (p.relaySeq !== undefined) {
          return p.relaySeq > afterCursor;
        }
        return p.timestamp > sinceTimestamp;
      }
      return p.timestamp > sinceTimestamp;
    });
  }

  storeMedia(roomId: string, media: EncryptedMediaRecord): boolean {
    const record = this.store.get(roomId);
    if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return false;
    }
    if (record.encryptedMedia.size >= 50) {
      return false;
    }
    record.lastActivity = Date.now();
    record.encryptedMedia.set(media.mediaId, {
      ...media,
      timestamp: Date.now()
    });
    return true;
  }

  getMedia(roomId: string, mediaId: string): EncryptedMediaRecord | null {
    const record = this.store.get(roomId);
    if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return null;
    }
    return record.encryptedMedia.get(mediaId) || null;
  }

  consumeMedia(roomId: string, mediaId: string): boolean {
    const record = this.store.get(roomId);
    if (!record || record.meta.state === 'DESTROYING' || record.meta.state === 'DESTROYED') {
      return false;
    }
    const existed = record.encryptedMedia.has(mediaId);
    if (existed) {
      record.encryptedMedia.delete(mediaId);
      record.lastActivity = Date.now();
    }
    return existed;
  }

  checkRateLimit(clientKey: string): RateLimitCheckResult {
    const now = Date.now();
    const record = this.rateLimits.get(clientKey);

    if (!record) {
      return { allowed: true };
    }

    if (record.lockedUntil > now) {
      return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
    }

    if (now - record.lastAttempt > 300000) {
      this.rateLimits.delete(clientKey);
      return { allowed: true };
    }

    if (record.attempts >= 5) {
      record.lockedUntil = now + 300000;
      return { allowed: false, retryAfter: 300 };
    }

    return { allowed: true };
  }

  recordFailedAttempt(clientKey: string): void {
    const now = Date.now();
    const record = this.rateLimits.get(clientKey) || {
      attempts: 0,
      lastAttempt: now,
      lockedUntil: 0
    };
    record.attempts += 1;
    record.lastAttempt = now;
    this.rateLimits.set(clientKey, record);
  }

  resetRateLimit(clientKey: string): void {
    this.rateLimits.delete(clientKey);
  }
}

/**
 * Fetch transport abstraction for testability without network dependencies.
 */
export type RedisFetchTransport = (
  url: string,
  options?: RequestInit
) => Promise<Response>;

/**
 * Distributed Room Store Adapter for Redis / Upstash REST.
 * Stores room state, segregated media records, and packet streams using atomic commands and strict TTLs.
 */
export class DistributedRoomStoreAdapter implements IRoomStoreAdapter {
  readonly adapterName = 'DistributedRoomStoreAdapter';
  readonly isDistributed = true;
  private readonly redisUrl: string;
  private readonly redisToken: string;
  private readonly customFetch?: RedisFetchTransport;

  constructor(redisUrl?: string, redisToken?: string, customFetch?: RedisFetchTransport) {
    this.redisUrl = (redisUrl || process.env.ENCLAVE_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
    this.redisToken = redisToken || process.env.ENCLAVE_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
    this.customFetch = customFetch;
  }

  get isConfigured(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  /**
   * Dispatches Upstash REST commands: pipeline or single command.
   */
  private async redisCommand<T = unknown>(command: unknown[]): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('[DISTRIBUTED STORE ERROR] Redis REST credentials not configured.');
    }

    const fetchImpl = this.customFetch || globalThis.fetch;
    const url = `${this.redisUrl}/pipeline`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([command]),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Redis REST request failed with HTTP ${res.status}`);
      }

      const results = (await res.json()) as Array<{ result?: T; error?: string }>;
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('Malformed Redis pipeline response');
      }

      if (results[0].error) {
        throw new Error(`Redis command error: ${results[0].error}`);
      }

      return results[0].result as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async redisPipeline<T = unknown>(commands: unknown[][]): Promise<T[]> {
    if (!this.isConfigured) {
      throw new Error('[DISTRIBUTED STORE ERROR] Redis REST credentials not configured.');
    }

    const fetchImpl = this.customFetch || globalThis.fetch;
    const url = `${this.redisUrl}/pipeline`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Redis pipeline request failed with HTTP ${res.status}`);
      }

      const results = (await res.json()) as Array<{ result?: unknown; error?: string }>;
      if (!Array.isArray(results)) {
        throw new Error('Malformed Redis pipeline response');
      }

      return results.map((r) => {
        if (r.error) throw new Error(`Redis pipeline sub-command error: ${r.error}`);
        return r.result as T;
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  // Key naming conventions
  private roomKey(roomId: string): string {
    return `enclave:room:${roomId}`;
  }
  private destroyedKey(roomId: string): string {
    return `enclave:room:${roomId}:destroyed`;
  }
  private packetsKey(roomId: string): string {
    return `enclave:room:${roomId}:packets`;
  }
  private mediaKey(roomId: string, mediaId: string): string {
    return `enclave:room:${roomId}:media:${mediaId}`;
  }
  private mediaIndexKey(roomId: string): string {
    return `enclave:room:${roomId}:media_index`;
  }
  private rateLimitKey(clientKey: string): string {
    return 'enclave:ratelimit:' + clientKey;
  }
  private seqKey(roomId: string): string {
    return `enclave:room:${roomId}:seq`;
  }
  /**
   * Atomic Lua Script: Room Creation
   * KEYS[1]: destroyedKey
   * KEYS[2]: roomKey
   * ARGV[1]: serializedRoomJson
   * ARGV[2]: ttlSeconds
   * Returns:
   *   -1 if destroyedKey exists (Tombstone present -> cannot resurrect)
   *    0 if roomKey already exists (Conflict -> room already created)
   *    1 if room successfully created
   */
  private static readonly LUA_CREATE_ROOM = `
    if redis.call('EXISTS', KEYS[1]) == 1 then
      return -1
    end
    local res = redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2], 'NX')
    if res then
      return 1
    else
      return 0
    end
  `.trim();

  /**
   * Atomic Lua Script: Room Deletion
   * KEYS[1]: destroyedKey
   * KEYS[2]: roomKey
   * KEYS[3]: packetsKey
   * KEYS[4]: mediaIndexKey
   * ARGV[1]: tombstoneTimestamp
   * ARGV[2]: tombstoneTtlSeconds
   * Reads media index set, deletes all indexed media blobs, sets tombstone,
   * and deletes roomKey, packetsKey, and mediaIndexKey in a single atomic invocation.
   */
  /**
   * Atomic Lua Script: Presence Update
   * KEYS[1]: destroyedKey
   * KEYS[2]: roomKey
   * KEYS[3]: packetsKey
   * KEYS[4]: mediaIndexKey
   * ARGV[1]: participantId
   * ARGV[2]: action ('join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here')
   * ARGV[3]: displayName
   * ARGV[4]: nowTimestamp
   * ARGV[5]: hardTtlSeconds
   */
  private static readonly LUA_UPDATE_PRESENCE = `
    local destroyed = redis.call('GET', KEYS[1])
    if destroyed then
      return cjson.encode({ status = 'DESTROYED', state = 'DESTROYED', participantCount = 0, participants = {}, lastActivity = tonumber(destroyed) })
    end

    local raw = redis.call('GET', KEYS[2])
    if not raw then
      return cjson.encode({ status = 'NOT_FOUND' })
    end

    local room = cjson.decode(raw)
    if room.meta.state == 'DESTROYING' or room.meta.state == 'DESTROYED' then
      return cjson.encode({ status = 'DESTROYED', state = 'DESTROYED', participantCount = 0, participants = {}, lastActivity = room.lastActivity or tonumber(ARGV[4]) })
    end

    local action = ARGV[2]
    local participantId = ARGV[1]
    local displayName = ARGV[3]
    local now = tonumber(ARGV[4])
    local hardTtl = tonumber(ARGV[5])
    room.lastActivity = now

    local function cleanupRoom()
      if KEYS[4] then
        local mediaIds = redis.call('SMEMBERS', KEYS[4])
        if mediaIds and #mediaIds > 0 then
          local prefix = KEYS[2] .. ':media:'
          for i = 1, #mediaIds, 500 do
            local chunk = {}
            for j = i, math.min(i + 499, #mediaIds) do
              chunk[#chunk + 1] = prefix .. mediaIds[j]
            end
            if #chunk > 0 then
              redis.call('DEL', unpack(chunk))
            end
          end
        end
        redis.call('DEL', KEYS[4])
      end
      if KEYS[3] then
        redis.call('DEL', KEYS[3])
      end
      if KEYS[5] then
        redis.call('DEL', KEYS[5])
      end
      redis.call('SET', KEYS[1], tostring(now), 'EX', hardTtl)
      redis.call('DEL', KEYS[2])
    end

    local sockets = {}
    for _, id in ipairs(room.activeSockets or {}) do sockets[id] = true end

    local heartbeats = {}
    for _, pair in ipairs(room.participantHeartbeats or {}) do heartbeats[pair[1]] = pair[2] end

    local participantInfo = {}
    for _, pair in ipairs(room.participantInfo or {}) do participantInfo[pair[1]] = pair[2] end

    if action == 'destroy' then
      cleanupRoom()
      return cjson.encode({ status = 'DESTROYED', state = 'DESTROYED', participantCount = 0, participants = {}, lastActivity = now })
    end

    if action == 'join' then
      if room.meta.oneTimeAccess and (room.meta.accessCount or 0) >= 2 and not sockets[participantId] then
        return cjson.encode({ status = 'FORBIDDEN' })
      end

      sockets[participantId] = true
      heartbeats[participantId] = now

      local existing = participantInfo[participantId]
      local name = displayName
      if not name or name == '' then name = existing and existing.displayName or 'Anonymous' end
      local joinedAt = existing and existing.joinedAt or now
      participantInfo[participantId] = { id = participantId, displayName = name, joinedAt = joinedAt }

      room.meta.accessCount = (room.meta.accessCount or 0) + 1
      local count = 0
      for _ in pairs(sockets) do count = count + 1 end
      room.meta.participantCount = count

      if room.meta.participantCount == 1 then room.meta.state = 'WAITING'
      elseif room.meta.participantCount >= 2 then room.meta.state = 'ACTIVE' end

    elseif action == 'heartbeat' or action == 'im_here' then
      sockets[participantId] = true
      heartbeats[participantId] = now

      local existing = participantInfo[participantId]
      if not existing then
        local name = (displayName and displayName ~= '') and displayName or 'Anonymous'
        participantInfo[participantId] = { id = participantId, displayName = name, joinedAt = now }
      elseif displayName and displayName ~= '' then
        existing.displayName = displayName
      end

      local count = 0
      for _ in pairs(sockets) do count = count + 1 end
      room.meta.participantCount = count
      if room.meta.participantCount >= 2 and room.meta.state == 'WAITING' then room.meta.state = 'ACTIVE' end

    elseif action == 'leave' then
      sockets[participantId] = nil
      heartbeats[participantId] = nil
      participantInfo[participantId] = nil

      local count = 0
      for _ in pairs(sockets) do count = count + 1 end
      room.meta.participantCount = count

      if room.meta.participantCount == 0 then
        cleanupRoom()
        return cjson.encode({ status = 'DESTROYED', state = 'DESTROYED', participantCount = 0, participants = {}, lastActivity = now })
      elseif room.meta.participantCount == 1 then room.meta.state = 'ENDING' end
    end

    local outSockets = {}
    for id in pairs(sockets) do table.insert(outSockets, id) end
    room.activeSockets = outSockets

    local outHeartbeats = {}
    for id, ts in pairs(heartbeats) do table.insert(outHeartbeats, { id, ts }) end
    room.participantHeartbeats = outHeartbeats

    local outInfo = {}
    local publicList = {}
    for id, info in pairs(participantInfo) do table.insert(outInfo, { id, info }) table.insert(publicList, info) end
    room.participantInfo = outInfo

    redis.call('SET', KEYS[2], cjson.encode(room), 'EX', hardTtl)
    return cjson.encode({ status = 'OK', state = room.meta.state, participantCount = room.meta.participantCount, participants = publicList, lastActivity = room.lastActivity })
  `.trim();

  /**
   * Atomic Lua Script: Store Encrypted Media
   * KEYS[1]: destroyedKey
   * KEYS[2]: roomKey
   * KEYS[3]: mediaKey
   * KEYS[4]: mediaIndexKey
   * ARGV[1]: mediaBlob
   * ARGV[2]: mediaId
   * ARGV[3]: mediaTtlSeconds
   */
  private static readonly LUA_STORE_MEDIA = `
    if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
    if redis.call('EXISTS', KEYS[2]) == 0 then return 0 end
    local count = redis.call('SCARD', KEYS[4])
    if count and tonumber(count) >= 50 then return 0 end
    redis.call('SET', KEYS[3], ARGV[1], 'EX', tonumber(ARGV[3]))
    redis.call('SADD', KEYS[4], ARGV[2])
    redis.call('EXPIRE', KEYS[4], tonumber(ARGV[3]))
    return 1
  `.trim();

  /**
   * Atomic Lua Script: Push Encrypted Wire Packet
   * KEYS[1]: destroyedKey
   * KEYS[2]: roomKey
   * KEYS[3]: packetsKey
   * KEYS[4]: seqKey
   * ARGV[1]: serializedPacket
   * ARGV[2]: maxPackets
   * ARGV[3]: packetTtlSeconds
   */
  private static readonly LUA_PUSH_PACKET = `
    if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
    if redis.call('EXISTS', KEYS[2]) == 0 then return 0 end
    local nextSeq = redis.call('INCR', KEYS[4])
    redis.call('EXPIRE', KEYS[4], tonumber(ARGV[3]))

    local ok, pkt = pcall(cjson.decode, ARGV[1])
    if not ok or not pkt then return 0 end
    pkt.relaySeq = nextSeq
    local serialized = cjson.encode(pkt)

    redis.call('RPUSH', KEYS[3], serialized)
    redis.call('LTRIM', KEYS[3], -tonumber(ARGV[2]), -1)
    redis.call('EXPIRE', KEYS[3], tonumber(ARGV[3]))
    return nextSeq
  `.trim();

  /**
   * Atomic Lua Script: Check Rate Limit
   * KEYS[1]: rateLimitKey
   * ARGV[1]: nowTimestamp
   * ARGV[2]: lockoutSeconds
   */
  private static readonly LUA_CHECK_RATE_LIMIT = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return cjson.encode({ allowed = true }) end
    local rec = cjson.decode(raw)
    local now = tonumber(ARGV[1])
    if (rec.lockedUntil or 0) > now then
      local retry = math.ceil((rec.lockedUntil - now) / 1000)
      return cjson.encode({ allowed = false, retryAfter = retry })
    end
    if now - (rec.lastAttempt or 0) > 300000 then
      redis.call('DEL', KEYS[1])
      return cjson.encode({ allowed = true })
    end
    if (rec.attempts or 0) >= 5 then
      rec.lockedUntil = now + 300000
      redis.call('SET', KEYS[1], cjson.encode(rec), 'EX', tonumber(ARGV[2]))
      return cjson.encode({ allowed = false, retryAfter = 300 })
    end
    return cjson.encode({ allowed = true })
  `.trim();

  /**
   * Atomic Lua Script: Record Failed Attempt
   * KEYS[1]: rateLimitKey
   * ARGV[1]: nowTimestamp
   * ARGV[2]: lockoutSeconds
   */
  private static readonly LUA_RECORD_FAILED_ATTEMPT = `
    local raw = redis.call('GET', KEYS[1])
    local now = tonumber(ARGV[1])
    local rec = { attempts = 0, lastAttempt = now, lockedUntil = 0 }
    if raw then
      local ok, parsed = pcall(cjson.decode, raw)
      if ok and parsed then rec = parsed end
    end
    rec.attempts = (rec.attempts or 0) + 1
    rec.lastAttempt = now
    redis.call('SET', KEYS[1], cjson.encode(rec), 'EX', tonumber(ARGV[2]))
    return 1
  `.trim();

  private static readonly LUA_DELETE_ROOM = `
    redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
    local mediaIds = redis.call('SMEMBERS', KEYS[4])
    if mediaIds and #mediaIds > 0 then
      local prefix = KEYS[2] .. ':media:'
      for i = 1, #mediaIds, 500 do
        local chunk = {}
        for j = i, math.min(i + 499, #mediaIds) do
          chunk[#chunk + 1] = prefix .. mediaIds[j]
        end
        if #chunk > 0 then
          redis.call('DEL', unpack(chunk))
        end
      end
    end
    if KEYS[5] then
      redis.call('DEL', KEYS[2], KEYS[3], KEYS[4], KEYS[5])
    else
      redis.call('DEL', KEYS[2], KEYS[3], KEYS[4])
    end
    return 1
  `.trim();

  async createRoom(roomId: string, record: ServerRoomRecord): Promise<boolean> {
    const serialized = JSON.stringify({
      meta: record.meta,
      activeSockets: Array.from(record.activeSockets),
      participantHeartbeats: Array.from(record.participantHeartbeats.entries()),
      participantInfo: Array.from(record.participantInfo.entries()),
      lastActivity: record.lastActivity
    });

    const res = await this.redisCommand<number>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_CREATE_ROOM,
      2,
      this.destroyedKey(roomId),
      this.roomKey(roomId),
      serialized,
      HARD_ROOM_TTL_SECONDS
    ]);

    return res === 1;
  }

  async getRoom(roomId: string): Promise<ServerRoomRecord | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.roomKey(roomId)]);
    if (!raw) return null;

    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || !parsed.meta) return null;

      // Packets are loaded from segregated packet list
      const packets = await this.getPackets(roomId, 0);

      return {
        meta: parsed.meta,
        activeSockets: new Set(parsed.activeSockets || []),
        participantHeartbeats: new Map(parsed.participantHeartbeats || []),
        participantInfo: new Map(parsed.participantInfo || []),
        recentPackets: packets,
        encryptedMedia: new Map(), // Segregated on demand
        lastActivity: parsed.lastActivity || parsed.meta.createdAt || Date.now()
      };
    } catch {
      return null;
    }
  }

  async hasRoom(roomId: string): Promise<boolean> {
    const exists = await this.redisCommand<number>(['EXISTS', this.roomKey(roomId)]);
    return exists === 1;
  }

  async deleteRoom(roomId: string, _reason = 'Dissolved'): Promise<void> {
    // Atomically place tombstone, fetch & delete all indexed media keys, packets, room, and sequence counter
    await this.redisCommand<number>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_DELETE_ROOM,
      5,
      this.destroyedKey(roomId),
      this.roomKey(roomId),
      this.packetsKey(roomId),
      this.mediaIndexKey(roomId),
      this.seqKey(roomId),
      String(Date.now()),
      HARD_ROOM_TTL_SECONDS
    ]);
  }

  async listRooms(): Promise<[string, ServerRoomRecord][]> {
    // Discovery across instances for administrative views
    const keys = (await this.redisCommand<string[]>(['KEYS', 'enclave:room:*'])) || [];
    const roomKeys = keys.filter(
      (k) => !k.includes(':packets') && !k.includes(':media') && !k.includes(':destroyed') && !k.includes(':seq')
    );

    if (roomKeys.length === 0) return [];

    const commands = roomKeys.map((k) => ['GET', k]);
    const results = await this.redisPipeline<string | null>(commands);

    const rooms: [string, ServerRoomRecord][] = [];
    for (let i = 0; i < roomKeys.length; i++) {
      const raw = results[i];
      if (!raw) continue;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const roomId = roomKeys[i].replace('enclave:room:', '');
        rooms.push([
          roomId,
          {
            meta: parsed.meta,
            activeSockets: new Set(parsed.activeSockets || []),
            participantHeartbeats: new Map(parsed.participantHeartbeats || []),
            participantInfo: new Map(parsed.participantInfo || []),
            recentPackets: [],
            encryptedMedia: new Map(),
            lastActivity: parsed.lastActivity || Date.now()
          }
        ]);
      } catch {
        // Ignore unparseable entries
      }
    }
    return rooms;
  }

  async updatePresence(
    roomId: string,
    participantId: string,
    action: 'join' | 'heartbeat' | 'leave' | 'destroy' | 'im_here',
    displayName?: string
  ): Promise<PresenceUpdateResult | null> {
    const rawRes = await this.redisCommand<string>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_UPDATE_PRESENCE,
      5,
      this.destroyedKey(roomId),
      this.roomKey(roomId),
      this.packetsKey(roomId),
      this.mediaIndexKey(roomId),
      this.seqKey(roomId),
      participantId,
      action,
      displayName || '',
      Date.now(),
      HARD_ROOM_TTL_SECONDS
    ]);

    if (!rawRes) return null;
    try {
      const parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
      if (parsed.status === 'NOT_FOUND' || parsed.status === 'FORBIDDEN') return null;
      if (parsed.status === 'DESTROYED') {
        return {
          state: 'DESTROYED',
          participantCount: 0,
          participants: [],
          lastActivity: parsed.lastActivity || Date.now()
        };
      }
      return {
        state: parsed.state,
        participantCount: parsed.participantCount,
        participants: parsed.participants || [],
        lastActivity: parsed.lastActivity
      };
    } catch {
      return null;
    }
  }

  async reapExpiredRooms(now = Date.now()): Promise<{ reapedRooms: number }> {
    const keys = (await this.redisCommand<string[]>(['KEYS', 'enclave:room:*'])) || [];
    const roomKeys = keys.filter(
      (k) => !k.includes(':packets') && !k.includes(':media') && !k.includes(':destroyed')
    );

    let reaped = 0;
    for (const key of roomKeys) {
      const roomId = key.replace('enclave:room:', '');
      const raw = await this.redisCommand<string | null>(['GET', key]);
      if (!raw) continue;

      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const lastActivity = parsed.lastActivity || parsed.meta.createdAt || now;
        const createdAt = parsed.meta.createdAt || now;
        const state = parsed.meta.state;

        const isWaitingIdle =
          state === 'WAITING' && now - lastActivity > WAITING_INACTIVITY_LIMIT_MS;
        const isIdle = now - lastActivity > 900000;
        const isAbandoned = state === 'CREATED' && now - createdAt > 600000;

        if (isWaitingIdle || isIdle || isAbandoned) {
          await this.deleteRoom(
            roomId,
            isWaitingIdle ? 'Waiting room inactivity timeout' : 'Idle room reap'
          );
          reaped++;
        }
      } catch {
        // Skip malformed entries
      }
    }

    return { reapedRooms: reaped };
  }

  async pushPacket(roomId: string, packet: WirePacket): Promise<boolean> {
    const now = Date.now();
    if (packet.expiresAt && packet.expiresAt <= now) {
      return false;
    }

    if (packet.type === 'disappearing_timer_update' && packet.disappearingTimerSec !== undefined) {
      const raw = await this.redisCommand<string | null>(['GET', this.roomKey(roomId)]);
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          parsed.meta.disappearingTimerSec = packet.disappearingTimerSec;
          await this.redisCommand<string>([
            'SET',
            this.roomKey(roomId),
            JSON.stringify(parsed),
            'KEEPTTL'
          ]);
        } catch {}
      }
    }

    const serialized = JSON.stringify(packet);
    const res = await this.redisCommand<number>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_PUSH_PACKET,
      4,
      this.destroyedKey(roomId),
      this.roomKey(roomId),
      this.packetsKey(roomId),
      this.seqKey(roomId),
      serialized,
      50,
      HARD_ROOM_TTL_SECONDS
    ]);
    return typeof res === 'number' && res > 0;
  }

  async getPackets(
    roomId: string,
    sinceTimestamp = 0,
    afterCursor?: number
  ): Promise<WirePacket[]> {
    const rawList =
      (await this.redisCommand<string[]>(['LRANGE', this.packetsKey(roomId), 0, -1])) || [];

    const now = Date.now();
    const packets: WirePacket[] = [];
    for (const item of rawList) {
      try {
        const parsed: WirePacket = typeof item === 'string' ? JSON.parse(item) : item;
        // Exclude expired packets so they can never be retrieved or replayed
        if (parsed.expiresAt && parsed.expiresAt <= now) {
          continue;
        }
        if (afterCursor !== undefined && typeof afterCursor === 'number' && !isNaN(afterCursor)) {
          if (parsed.relaySeq !== undefined) {
            if (parsed.relaySeq > afterCursor) {
              packets.push(parsed);
            }
          } else if (parsed.timestamp > sinceTimestamp) {
            packets.push(parsed);
          }
        } else if (parsed.timestamp > sinceTimestamp) {
          packets.push(parsed);
        }
      } catch {
        // Skip malformed packet
      }
    }
    return packets;
  }

  async storeMedia(roomId: string, media: EncryptedMediaRecord): Promise<boolean> {
    const mediaBlob = JSON.stringify(media);
    const res = await this.redisCommand<number>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_STORE_MEDIA,
      4,
      this.destroyedKey(roomId),
      this.roomKey(roomId),
      this.mediaKey(roomId, media.mediaId),
      this.mediaIndexKey(roomId),
      mediaBlob,
      media.mediaId,
      MEDIA_TTL_SECONDS
    ]);
    return res === 1;
  }

  async getMedia(roomId: string, mediaId: string): Promise<EncryptedMediaRecord | null> {
    const raw = await this.redisCommand<string | null>([
      'GET',
      this.mediaKey(roomId, mediaId)
    ]);
    if (!raw) return null;

    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as EncryptedMediaRecord);
    } catch {
      return null;
    }
  }

  async consumeMedia(roomId: string, mediaId: string): Promise<boolean> {
    const mediaKey = this.roomKey(roomId) + ':media:' + mediaId;
    const res = await this.redisCommand<number>([
      'EVAL',
      `
        local delCount = redis.call('DEL', KEYS[1])
        redis.call('SREM', KEYS[2], ARGV[1])
        return delCount
      `.trim(),
      2,
      mediaKey,
      this.mediaIndexKey(roomId),
      mediaId
    ]);
    return typeof res === 'number' && res > 0;
  }

  async checkRateLimit(clientKey: string): Promise<RateLimitCheckResult> {
    const raw = await this.redisCommand<string>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_CHECK_RATE_LIMIT,
      1,
      this.rateLimitKey(clientKey),
      Date.now(),
      RATE_LIMIT_LOCKOUT_SECONDS
    ]);
    if (!raw) return { allowed: true };
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        allowed: Boolean(parsed.allowed),
        retryAfter: parsed.retryAfter
      };
    } catch {
      return { allowed: true };
    }
  }

  async recordFailedAttempt(clientKey: string): Promise<void> {
    await this.redisCommand<number>([
      'EVAL',
      DistributedRoomStoreAdapter.LUA_RECORD_FAILED_ATTEMPT,
      1,
      this.rateLimitKey(clientKey),
      Date.now(),
      RATE_LIMIT_LOCKOUT_SECONDS
    ]);
  }

  async resetRateLimit(clientKey: string): Promise<void> {
    await this.redisCommand(['DEL', this.rateLimitKey(clientKey)]);
  }
}

/**
 * Singleton runtime adapter resolver.
 * Development / Test: Defaults to InMemoryRoomStoreAdapter.
 * Production: Requires ENCLAVE_REDIS_REST_URL and ENCLAVE_REDIS_REST_TOKEN.
 * Fails closed if production is missing distributed Redis credentials.
 */
let activeAdapterInstance: IRoomStoreAdapter | null = null;

export function getRoomStoreAdapter(): IRoomStoreAdapter {
  if (activeAdapterInstance) {
    return activeAdapterInstance;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const redisUrl = process.env.ENCLAVE_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.ENCLAVE_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    activeAdapterInstance = new DistributedRoomStoreAdapter(redisUrl, redisToken);
    return activeAdapterInstance;
  }

  if (isProduction) {
    // FAIL CLOSED: Never silently use InMemory store across multiple production serverless instances
    throw new Error(
      '[ENCLAVE PRODUCTION CRITICAL] Production deployment requires distributed Redis storage. ' +
      'Missing ENCLAVE_REDIS_REST_URL or ENCLAVE_REDIS_REST_TOKEN. ' +
      'Refusing silent in-memory fallback to prevent cross-instance room isolation vulnerabilities.'
    );
  }

  // Development / Test single-process default: bind to shared global Maps
  const globalRooms = (globalThis as unknown as { enclaveRoomStore?: Map<string, ServerRoomRecord>; enclaveRateLimitStore?: Map<string, any> });
  activeAdapterInstance = new InMemoryRoomStoreAdapter(
    globalRooms.enclaveRoomStore,
    globalRooms.enclaveRateLimitStore
  );
  return activeAdapterInstance;
}

/**
 * Explicit helper for tests or runtime configuration resets.
 */
export function setRoomStoreAdapter(adapter: IRoomStoreAdapter | null): void {
  activeAdapterInstance = adapter;
}
