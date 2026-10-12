/**
 * ENCLAVE Account, Admin & Security Storage Adapter Interface & Implementations
 * 
 * Provides an explicit storage abstraction layer:
 * - IAccountAdminStoreAdapter: Contract supporting:
 *   1. User Accounts: persistent server records, verification tokens, password auth.
 *   2. Admin Sessions: token validation, sliding expiration, revocation, CSRF verification.
 *   3. IP Blocks: block list, expiry, removal.
 *   4. Platform Settings: centralized runtime configuration with bounds validation.
 *   5. Audit Logs: append-only audit trail with pagination and filtering.
 *   6. Security Incidents: incident log buffer.
 *   7. Admin Login Rate Limits: brute-force tracking & lockout.
 * 
 * - InMemoryAccountAdminStoreAdapter: Development/testing single-process implementation with optional file persistence.
 * - DistributedAccountAdminStoreAdapter: Production-grade Redis / Upstash REST implementation.
 * - Runtime adapter selection via getAccountAdminStoreAdapter():
 *   In development: defaults to InMemory;
 *   In production: fails closed if Redis configuration is absent or invalid.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { RedisFetchTransport } from './serverRoomAdapter';
import type { PlatformSettings } from './serverSettingsStore';
import type { IpBlockRecord, SecurityIncident } from './serverSecurityStore';
import type { AuditEvent } from './serverAuditStore';
import type { AdminSession } from './serverAdminStore';
import type { ServerUserRecord } from './serverUserStore';

export type {
  PlatformSettings,
  IpBlockRecord,
  SecurityIncident,
  AuditEvent,
  AdminSession,
  ServerUserRecord
};

export interface AdminLoginAttemptRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number;
}

export interface IAccountAdminStoreAdapter {
  readonly adapterName: string;
  readonly isDistributed: boolean;

  // 1. User Accounts
  getUserByEmail(email: string): Promise<ServerUserRecord | null> | ServerUserRecord | null;
  getUserById(id: string): Promise<ServerUserRecord | null> | ServerUserRecord | null;
  saveUser(user: ServerUserRecord): Promise<void> | void;
  createUserNX(user: ServerUserRecord): Promise<boolean> | boolean;
  findUserByTokenHash(tokenHash: string): Promise<ServerUserRecord | null> | ServerUserRecord | null;
  deleteUserToken?(tokenHash: string): Promise<void> | void;
  listAllUsers(): Promise<ServerUserRecord[]> | ServerUserRecord[];

  // 2. Admin Sessions
  getAdminSession(token: string): Promise<AdminSession | null> | AdminSession | null;
  saveAdminSession(session: AdminSession): Promise<void> | void;
  deleteAdminSession(token: string): Promise<boolean> | boolean;

  // 3. Admin Login Rate Limiting
  getAdminLoginAttempt(ip: string): Promise<AdminLoginAttemptRecord | null> | AdminLoginAttemptRecord | null;
  saveAdminLoginAttempt(ip: string, attempt: AdminLoginAttemptRecord): Promise<void> | void;
  deleteAdminLoginAttempt(ip: string): Promise<void> | void;

  // 4. IP Blocks
  getIpBlock(ip: string): Promise<IpBlockRecord | null> | IpBlockRecord | null;
  saveIpBlock(record: IpBlockRecord): Promise<void> | void;
  deleteIpBlock(ip: string): Promise<boolean> | boolean;
  listActiveIpBlocks(): Promise<IpBlockRecord[]> | IpBlockRecord[];

  // 5. Platform Settings
  getPlatformSettings(): Promise<PlatformSettings | null> | PlatformSettings | null;
  savePlatformSettings(settings: PlatformSettings): Promise<void> | void;

  // 6. Audit Logs
  appendAuditLog(event: AuditEvent): Promise<void> | void;
  getAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    adminUser?: string;
    status?: 'SUCCESS' | 'FAILED' | 'REJECTED';
  }): Promise<{ logs: AuditEvent[]; total: number }> | { logs: AuditEvent[]; total: number };

  // 7. Security Incidents
  appendSecurityIncident(incident: SecurityIncident): Promise<void> | void;
  getRecentIncidents(limit?: number): Promise<SecurityIncident[]> | SecurityIncident[];
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  maintenanceNotice: 'ENCLAVE is undergoing scheduled maintenance. Please check back shortly.',
  maxRoomLifetimeMs: 900000, // 15 minutes idle reap
  waitingInactivityLimitMs: 180000, // 3 minutes waiting idle
  maxFileSizeMb: 25, // 25 MB max file upload
  rateLimitMaxAttempts: 5,
  rateLimitLockoutMs: 300000, // 5 minutes
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/json'
  ],
  updatedAt: Date.now(),
  updatedBy: 'system'
};

const MAX_AUDIT_LOGS_RETAINED = 1000;
const MAX_INCIDENTS_RETAINED = 500;
const ADMIN_SESSION_TTL_SECONDS = 3600; // 1 hour

/**
 * In-Memory reference implementation for development, tests, and offline execution.
 */
export class InMemoryAccountAdminStoreAdapter implements IAccountAdminStoreAdapter {
  readonly adapterName = 'InMemoryAccountAdminStoreAdapter';
  readonly isDistributed = false;

  public users = new Map<string, ServerUserRecord>(); // Normalized email -> user
  public usersById = new Map<string, string>(); // ID -> normalized email
  public adminSessions = new Map<string, AdminSession>(); // token -> session
  public adminLoginAttempts = new Map<string, AdminLoginAttemptRecord>(); // ip -> attempts
  public ipBlocks = new Map<string, IpBlockRecord>(); // ip -> block record
  public settings: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  public auditLogs: AuditEvent[] = [];
  public incidents: SecurityIncident[] = [];

  constructor(initialData?: {
    users?: Map<string, ServerUserRecord>;
    usersById?: Map<string, string>;
    adminSessions?: Map<string, AdminSession>;
    adminLoginAttempts?: Map<string, AdminLoginAttemptRecord>;
    ipBlocks?: Map<string, IpBlockRecord>;
    settings?: PlatformSettings;
    auditLogs?: AuditEvent[];
    incidents?: SecurityIncident[];
  }) {
    if (initialData?.users) this.users = initialData.users;
    if (initialData?.usersById) this.usersById = initialData.usersById;
    if (initialData?.adminSessions) this.adminSessions = initialData.adminSessions;
    if (initialData?.adminLoginAttempts) this.adminLoginAttempts = initialData.adminLoginAttempts;
    if (initialData?.ipBlocks) this.ipBlocks = initialData.ipBlocks;
    if (initialData?.settings) this.settings = initialData.settings;
    if (initialData?.auditLogs) this.auditLogs = initialData.auditLogs;
    if (initialData?.incidents) this.incidents = initialData.incidents;
  }

  // User Accounts
  getUserByEmail(email: string): ServerUserRecord | null {
    return this.users.get(email.trim().toLowerCase()) || null;
  }

  getUserById(id: string): ServerUserRecord | null {
    const email = this.usersById.get(id.trim());
    if (!email) return null;
    return this.users.get(email) || null;
  }

  saveUser(user: ServerUserRecord): void {
    const email = user.email.trim().toLowerCase();
    this.users.set(email, { ...user, email });
    this.usersById.set(user.id.trim(), email);
  }

  createUserNX(user: ServerUserRecord): boolean {
    const email = user.email.trim().toLowerCase();
    if (this.users.has(email) || this.usersById.has(user.id.trim())) {
      return false;
    }
    this.users.set(email, { ...user, email });
    this.usersById.set(user.id.trim(), email);
    return true;
  }

  findUserByTokenHash(tokenHash: string): ServerUserRecord | null {
    const target = new TextEncoder().encode(tokenHash);
    for (const user of this.users.values()) {
      if (user.verificationTokenHash) {
        const current = new TextEncoder().encode(user.verificationTokenHash);
        if (current.length === target.length && timingSafeEqual(current, target)) {
          return user;
        }
      }
    }
    return null;
  }

  listAllUsers(): ServerUserRecord[] {
    return Array.from(this.users.values());
  }

  // Admin Sessions
  getAdminSession(token: string): AdminSession | null {
    const session = this.adminSessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.adminSessions.delete(token);
      return null;
    }
    return session;
  }

  saveAdminSession(session: AdminSession): void {
    this.adminSessions.set(session.token, { ...session });
  }

  deleteAdminSession(token: string): boolean {
    return this.adminSessions.delete(token);
  }

  // Admin Login Rate Limiting
  getAdminLoginAttempt(ip: string): AdminLoginAttemptRecord | null {
    const rec = this.adminLoginAttempts.get(ip);
    if (!rec) return null;
    const now = Date.now();
    if (now - rec.lastAttempt > 900000 && rec.lockedUntil < now) {
      this.adminLoginAttempts.delete(ip);
      return null;
    }
    return rec;
  }

  saveAdminLoginAttempt(ip: string, attempt: AdminLoginAttemptRecord): void {
    this.adminLoginAttempts.set(ip, { ...attempt });
  }

  deleteAdminLoginAttempt(ip: string): void {
    this.adminLoginAttempts.delete(ip);
  }

  // IP Blocks
  getIpBlock(ip: string): IpBlockRecord | null {
    const rec = this.ipBlocks.get(ip);
    if (!rec) return null;
    if (rec.expiresAt > 0 && Date.now() > rec.expiresAt) {
      this.ipBlocks.delete(ip);
      return null;
    }
    return rec;
  }

  saveIpBlock(record: IpBlockRecord): void {
    this.ipBlocks.set(record.ip, { ...record });
  }

  deleteIpBlock(ip: string): boolean {
    return this.ipBlocks.delete(ip);
  }

  listActiveIpBlocks(): IpBlockRecord[] {
    const now = Date.now();
    const active: IpBlockRecord[] = [];
    for (const [ip, rec] of this.ipBlocks.entries()) {
      if (rec.expiresAt > 0 && now > rec.expiresAt) {
        this.ipBlocks.delete(ip);
      } else {
        active.push(rec);
      }
    }
    return active;
  }

  // Platform Settings
  getPlatformSettings(): PlatformSettings {
    return { ...this.settings };
  }

  savePlatformSettings(settings: PlatformSettings): void {
    this.settings = { ...settings };
  }

  // Audit Logs
  appendAuditLog(event: AuditEvent): void {
    this.auditLogs.unshift({ ...event });
    if (this.auditLogs.length > MAX_AUDIT_LOGS_RETAINED) {
      this.auditLogs.pop();
    }
  }

  getAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    adminUser?: string;
    status?: 'SUCCESS' | 'FAILED' | 'REJECTED';
  }): { logs: AuditEvent[]; total: number } {
    const { limit = 50, offset = 0, action, adminUser, status } = options || {};
    let filtered = this.auditLogs;

    if (action) {
      filtered = filtered.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (adminUser) {
      filtered = filtered.filter(l => l.adminUser.toLowerCase() === adminUser.toLowerCase());
    }
    if (status) {
      filtered = filtered.filter(l => l.status === status);
    }

    const paginated = filtered.slice(offset, offset + limit);
    return { logs: paginated, total: filtered.length };
  }

  // Security Incidents
  appendSecurityIncident(incident: SecurityIncident): void {
    this.incidents.unshift({ ...incident });
    if (this.incidents.length > MAX_INCIDENTS_RETAINED) {
      this.incidents.pop();
    }
  }

  getRecentIncidents(limit = 50): SecurityIncident[] {
    return this.incidents.slice(0, limit);
  }
}

/**
 * Production-Grade Distributed Account & Admin Store Adapter using Upstash Redis REST.
 * 
 * Key Namespaces:
 * - enclave:user:<normalizedEmail> -> JSON ServerUserRecord
 * - enclave:user_id:<id> -> normalizedEmail string
 * - enclave:user_token:<tokenHash> -> normalizedEmail string (with token TTL)
 * - enclave:user_index -> Set of normalizedEmails
 * - enclave:admin:session:<token> -> JSON AdminSession (with sliding TTL)
 * - enclave:admin:login_attempt:<ip> -> JSON AdminLoginAttemptRecord (with 15 min TTL)
 * - enclave:security:ip_block:<ip> -> JSON IpBlockRecord (with TTL if durationMs > 0)
 * - enclave:security:ip_blocks -> Set of blocked IP strings
 * - enclave:settings -> JSON PlatformSettings
 * - enclave:audit:logs -> Redis List of serialized AuditEvent (LTRIM to 1000)
 * - enclave:security:incidents -> Redis List of serialized SecurityIncident (LTRIM to 500)
 */
export class DistributedAccountAdminStoreAdapter implements IAccountAdminStoreAdapter {
  readonly adapterName = 'DistributedAccountAdminStoreAdapter';
  readonly isDistributed = true;

  private readonly redisUrl: string;
  private readonly redisToken: string;
  private readonly customFetch?: RedisFetchTransport;

  constructor(
    redisUrlOrOptions?: string | { url?: string; token?: string; transport?: RedisFetchTransport },
    redisToken?: string,
    customFetch?: RedisFetchTransport
  ) {
    if (typeof redisUrlOrOptions === 'object' && redisUrlOrOptions !== null) {
      this.redisUrl = (redisUrlOrOptions.url || process.env.ENCLAVE_REDIS_REST_URL || '').replace(/\/$/, '');
      this.redisToken = redisUrlOrOptions.token || process.env.ENCLAVE_REDIS_REST_TOKEN || '';
      this.customFetch = redisUrlOrOptions.transport;
    } else {
      this.redisUrl = (redisUrlOrOptions || process.env.ENCLAVE_REDIS_REST_URL || '').replace(/\/$/, '');
      this.redisToken = redisToken || process.env.ENCLAVE_REDIS_REST_TOKEN || '';
      this.customFetch = customFetch;
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.redisUrl && this.redisToken);
  }

  private async redisCommand<T = unknown>(command: unknown[]): Promise<T> {
    if (!this.isConfigured) {
      throw new Error('[DISTRIBUTED ACCOUNT STORE ERROR] Redis REST credentials not configured.');
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
      throw new Error('[DISTRIBUTED ACCOUNT STORE ERROR] Redis REST credentials not configured.');
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

  // --- Key Helpers ---
  private userKey(email: string): string {
    return `enclave:user:${email.trim().toLowerCase()}`;
  }
  private userIdKey(id: string): string {
    return `enclave:user_id:${id.trim()}`;
  }
  private userTokenKey(tokenHash: string): string {
    return `enclave:user_token:${tokenHash.trim()}`;
  }
  private userIndexKey(): string {
    return 'enclave:user_index';
  }
  private adminSessionKey(token: string): string {
    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    return `enclave:admin:session:${tokenHash}`;
  }
  private adminLoginAttemptKey(ip: string): string {
    return `enclave:admin:login_attempt:${ip.trim()}`;
  }
  private ipBlockKey(ip: string): string {
    return `enclave:security:ip_block:${ip.trim()}`;
  }
  private ipBlocksIndexKey(): string {
    return 'enclave:security:ip_blocks';
  }
  private settingsKey(): string {
    return 'enclave:settings';
  }
  private auditLogsKey(): string {
    return 'enclave:audit:logs';
  }
  private incidentsKey(): string {
    return 'enclave:security:incidents';
  }

  // --- 1. User Accounts ---
  async getUserByEmail(email: string): Promise<ServerUserRecord | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.userKey(email)]);
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as ServerUserRecord);
    } catch {
      return null;
    }
  }

  async getUserById(id: string): Promise<ServerUserRecord | null> {
    const email = await this.redisCommand<string | null>(['GET', this.userIdKey(id)]);
    if (!email) return null;
    return this.getUserByEmail(email);
  }

  async saveUser(user: ServerUserRecord): Promise<void> {
    const email = user.email.trim().toLowerCase();
    const serialized = JSON.stringify(user);
    const pipeline: unknown[][] = [
      ['SET', this.userKey(email), serialized],
      ['SET', this.userIdKey(user.id), email],
      ['SADD', this.userIndexKey(), email]
    ];

    if (user.verificationTokenHash) {
      let ttlSeconds = 1800; // 30 minutes default
      if (user.verificationTokenExpiresAt) {
        const remaining = Math.ceil((user.verificationTokenExpiresAt - Date.now()) / 1000);
        ttlSeconds = remaining > 0 ? remaining : 60;
      }
      pipeline.push(['SET', this.userTokenKey(user.verificationTokenHash), email, 'EX', ttlSeconds]);
    }

    await this.redisPipeline(pipeline);
  }

  /**
   * Atomic Lua Script: Create User NX (Anti-Collision / Anti-Overwrite)
   * KEYS[1]: userKey (enclave:user:<email>)
   * KEYS[2]: userIdKey (enclave:user_id:<id>)
   * KEYS[3]: userIndexKey (enclave:user_index)
   * KEYS[4]: userTokenKey (enclave:user_token:<tokenHash> or empty)
   * ARGV[1]: serializedUserJson
   * ARGV[2]: email
   * ARGV[3]: tokenTtlSeconds ("0" if no token)
   * Returns 1 if created successfully, 0 if email or ID already exists.
   */
  private static readonly LUA_CREATE_USER_NX = `
    if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1 then
      return 0
    end
    redis.call('SET', KEYS[1], ARGV[1])
    redis.call('SET', KEYS[2], ARGV[2])
    redis.call('SADD', KEYS[3], ARGV[2])
    local tokenTtl = tonumber(ARGV[3])
    if tokenTtl and tokenTtl > 0 and KEYS[4] and KEYS[4] ~= '' then
      redis.call('SET', KEYS[4], ARGV[2], 'EX', tokenTtl)
    end
    return 1
  `.trim();

  async createUserNX(user: ServerUserRecord): Promise<boolean> {
    const email = user.email.trim().toLowerCase();
    const serialized = JSON.stringify(user);
    let tokenTtl = 0;
    let tokenKey = '';

    if (user.verificationTokenHash) {
      tokenKey = this.userTokenKey(user.verificationTokenHash);
      if (user.verificationTokenExpiresAt) {
        const remaining = Math.ceil((user.verificationTokenExpiresAt - Date.now()) / 1000);
        tokenTtl = remaining > 0 ? remaining : 60;
      } else {
        tokenTtl = 1800;
      }
    }

    const res = await this.redisCommand<number>([
      'EVAL',
      DistributedAccountAdminStoreAdapter.LUA_CREATE_USER_NX,
      4,
      this.userKey(email),
      this.userIdKey(user.id),
      this.userIndexKey(),
      tokenKey || 'enclave:noop',
      serialized,
      email,
      String(tokenTtl)
    ]);

    return res === 1;
  }

  async findUserByTokenHash(tokenHash: string): Promise<ServerUserRecord | null> {
    const email = await this.redisCommand<string | null>(['GET', this.userTokenKey(tokenHash)]);
    if (!email) {
      // Fallback search across all users for resiliency
      const allUsers = await this.listAllUsers();
      const target = new TextEncoder().encode(tokenHash);
      for (const u of allUsers) {
        if (u.verificationTokenHash) {
          const current = new TextEncoder().encode(u.verificationTokenHash);
          if (current.length === target.length && timingSafeEqual(current, target)) {
            return u;
          }
        }
      }
      return null;
    }
    return this.getUserByEmail(email);
  }

  async deleteUserToken(tokenHash: string): Promise<void> {
    await this.redisCommand(['DEL', this.userTokenKey(tokenHash)]);
  }

  async listAllUsers(): Promise<ServerUserRecord[]> {
    const emails = await this.redisCommand<string[]>(['SMEMBERS', this.userIndexKey()]);
    if (!Array.isArray(emails) || emails.length === 0) return [];

    const commands = emails.map(e => ['GET', this.userKey(e)]);
    const rawResults = await this.redisPipeline<string | null>(commands);

    const users: ServerUserRecord[] = [];
    for (const r of rawResults) {
      if (r) {
        try {
          users.push(typeof r === 'string' ? JSON.parse(r) : r);
        } catch {}
      }
    }
    return users;
  }

  // --- 2. Admin Sessions ---
  async getAdminSession(token: string): Promise<AdminSession | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.adminSessionKey(token)]);
    if (!raw) return null;
    try {
      const session: AdminSession = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Date.now() > session.expiresAt) {
        await this.deleteAdminSession(token);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  async saveAdminSession(session: AdminSession): Promise<void> {
    const remainingSeconds = Math.max(60, Math.ceil((session.expiresAt - Date.now()) / 1000));
    await this.redisCommand([
      'SET',
      this.adminSessionKey(session.token),
      JSON.stringify(session),
      'EX',
      remainingSeconds
    ]);
  }

  async deleteAdminSession(token: string): Promise<boolean> {
    const res = await this.redisCommand<number>(['DEL', this.adminSessionKey(token)]);
    return res === 1;
  }

  // --- 3. Admin Login Rate Limiting ---
  async getAdminLoginAttempt(ip: string): Promise<AdminLoginAttemptRecord | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.adminLoginAttemptKey(ip)]);
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }

  async saveAdminLoginAttempt(ip: string, attempt: AdminLoginAttemptRecord): Promise<void> {
    await this.redisCommand([
      'SET',
      this.adminLoginAttemptKey(ip),
      JSON.stringify(attempt),
      'EX',
      900 // 15 minutes TTL
    ]);
  }

  async deleteAdminLoginAttempt(ip: string): Promise<void> {
    await this.redisCommand(['DEL', this.adminLoginAttemptKey(ip)]);
  }

  // --- 4. IP Blocks ---
  async getIpBlock(ip: string): Promise<IpBlockRecord | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.ipBlockKey(ip)]);
    if (!raw) return null;
    try {
      const rec: IpBlockRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (rec.expiresAt > 0 && Date.now() > rec.expiresAt) {
        await this.deleteIpBlock(ip);
        return null;
      }
      return rec;
    } catch {
      return null;
    }
  }

  async saveIpBlock(record: IpBlockRecord): Promise<void> {
    const pipeline: unknown[][] = [
      ['SADD', this.ipBlocksIndexKey(), record.ip]
    ];
    if (record.expiresAt > 0) {
      const remainingSeconds = Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000));
      pipeline.push(['SET', this.ipBlockKey(record.ip), JSON.stringify(record), 'EX', remainingSeconds]);
    } else {
      pipeline.push(['SET', this.ipBlockKey(record.ip), JSON.stringify(record)]);
    }
    await this.redisPipeline(pipeline);
  }

  async deleteIpBlock(ip: string): Promise<boolean> {
    const results = await this.redisPipeline<number>([
      ['DEL', this.ipBlockKey(ip)],
      ['SREM', this.ipBlocksIndexKey(), ip]
    ]);
    return results[0] > 0 || results[1] > 0;
  }

  async listActiveIpBlocks(): Promise<IpBlockRecord[]> {
    const ips = await this.redisCommand<string[]>(['SMEMBERS', this.ipBlocksIndexKey()]);
    if (!Array.isArray(ips) || ips.length === 0) return [];

    const commands = ips.map(ip => ['GET', this.ipBlockKey(ip)]);
    const rawResults = await this.redisPipeline<string | null>(commands);

    const now = Date.now();
    const active: IpBlockRecord[] = [];
    const expiredIps: string[] = [];

    for (let i = 0; i < ips.length; i++) {
      const raw = rawResults[i];
      if (!raw) {
        expiredIps.push(ips[i]);
        continue;
      }
      try {
        const rec: IpBlockRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (rec.expiresAt > 0 && now > rec.expiresAt) {
          expiredIps.push(ips[i]);
        } else {
          active.push(rec);
        }
      } catch {
        expiredIps.push(ips[i]);
      }
    }

    if (expiredIps.length > 0) {
      const cleanupPipeline = expiredIps.map(ip => ['SREM', this.ipBlocksIndexKey(), ip]);
      await this.redisPipeline(cleanupPipeline).catch(() => {});
    }

    return active;
  }

  // --- 5. Platform Settings ---
  async getPlatformSettings(): Promise<PlatformSettings | null> {
    const raw = await this.redisCommand<string | null>(['GET', this.settingsKey()]);
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }

  async savePlatformSettings(settings: PlatformSettings): Promise<void> {
    await this.redisCommand(['SET', this.settingsKey(), JSON.stringify(settings)]);
  }

  // --- 6. Audit Logs ---
  async appendAuditLog(event: AuditEvent): Promise<void> {
    await this.redisPipeline([
      ['LPUSH', this.auditLogsKey(), JSON.stringify(event)],
      ['LTRIM', this.auditLogsKey(), 0, MAX_AUDIT_LOGS_RETAINED - 1]
    ]);
  }

  async getAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    adminUser?: string;
    status?: 'SUCCESS' | 'FAILED' | 'REJECTED';
  }): Promise<{ logs: AuditEvent[]; total: number }> {
    const { limit = 50, offset = 0, action, adminUser, status } = options || {};

    const rawList = await this.redisCommand<string[]>(['LRANGE', this.auditLogsKey(), 0, -1]);
    if (!Array.isArray(rawList)) return { logs: [], total: 0 };

    let logs: AuditEvent[] = [];
    for (const item of rawList) {
      try {
        logs.push(typeof item === 'string' ? JSON.parse(item) : item);
      } catch {}
    }

    if (action) {
      logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (adminUser) {
      logs = logs.filter(l => l.adminUser.toLowerCase() === adminUser.toLowerCase());
    }
    if (status) {
      logs = logs.filter(l => l.status === status);
    }

    const total = logs.length;
    const paginated = logs.slice(offset, offset + limit);
    return { logs: paginated, total };
  }

  // --- 7. Security Incidents ---
  async appendSecurityIncident(incident: SecurityIncident): Promise<void> {
    await this.redisPipeline([
      ['LPUSH', this.incidentsKey(), JSON.stringify(incident)],
      ['LTRIM', this.incidentsKey(), 0, MAX_INCIDENTS_RETAINED - 1]
    ]);
  }

  async getRecentIncidents(limit = 50): Promise<SecurityIncident[]> {
    const rawList = await this.redisCommand<string[]>(['LRANGE', this.incidentsKey(), 0, limit - 1]);
    if (!Array.isArray(rawList)) return [];

    const incidents: SecurityIncident[] = [];
    for (const item of rawList) {
      try {
        incidents.push(typeof item === 'string' ? JSON.parse(item) : item);
      } catch {}
    }
    return incidents;
  }
}

/**
 * Singleton runtime adapter resolver for Account & Admin stores.
 * Development / Test: Defaults to InMemoryAccountAdminStoreAdapter.
 * Production: Requires ENCLAVE_REDIS_REST_URL and ENCLAVE_REDIS_REST_TOKEN.
 * Fails closed if production is missing distributed Redis credentials.
 */
let activeAccountAdminAdapter: IAccountAdminStoreAdapter | null = null;

export function getAccountAdminStoreAdapter(): IAccountAdminStoreAdapter {
  if (activeAccountAdminAdapter) {
    return activeAccountAdminAdapter;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const redisUrl = process.env.ENCLAVE_REDIS_REST_URL;
  const redisToken = process.env.ENCLAVE_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    activeAccountAdminAdapter = new DistributedAccountAdminStoreAdapter(redisUrl, redisToken);
    return activeAccountAdminAdapter;
  }

  if (isProduction) {
    // FAIL CLOSED: Never silently use InMemory store across multiple production serverless instances
    throw new Error(
      '[ENCLAVE PRODUCTION CRITICAL] Production deployment requires distributed Redis storage for accounts, sessions, and security state. ' +
      'Missing ENCLAVE_REDIS_REST_URL or ENCLAVE_REDIS_REST_TOKEN. ' +
      'Refusing silent in-memory fallback to prevent cross-instance isolation and security bypass vulnerabilities.'
    );
  }

  // Development / Test single-process default: bind to shared global Maps
  const globalUsers = (globalThis as unknown as { enclaveServerUsers?: Map<string, ServerUserRecord>; enclaveServerUsersById?: Map<string, string> });
  const globalAdmin = (globalThis as unknown as { enclaveAdminSessions?: Map<string, AdminSession>; enclaveAdminAttempts?: Map<string, AdminLoginAttemptRecord> });
  const globalSecurity = (globalThis as unknown as { enclaveIpBlocks?: Map<string, IpBlockRecord>; enclaveIncidents?: SecurityIncident[] });
  const globalSettings = (globalThis as unknown as { enclavePlatformSettings?: PlatformSettings });
  const globalAudit = (globalThis as unknown as { enclaveAuditStore?: AuditEvent[] });

  activeAccountAdminAdapter = new InMemoryAccountAdminStoreAdapter({
    users: globalUsers.enclaveServerUsers,
    usersById: globalUsers.enclaveServerUsersById,
    adminSessions: globalAdmin.enclaveAdminSessions,
    adminLoginAttempts: globalAdmin.enclaveAdminAttempts,
    ipBlocks: globalSecurity.enclaveIpBlocks,
    incidents: globalSecurity.enclaveIncidents,
    settings: globalSettings.enclavePlatformSettings,
    auditLogs: globalAudit.enclaveAuditStore
  });

  return activeAccountAdminAdapter;
}

export function setAccountAdminStoreAdapter(adapter: IAccountAdminStoreAdapter | null): void {
  activeAccountAdminAdapter = adapter;
}
