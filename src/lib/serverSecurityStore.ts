/**
 * ENCLAVE Server Security Store
 * Tracks active IP blocks, security incidents, and abuse signals.
 * Integrated with IAccountAdminStoreAdapter for multi-instance distributed synchronization.
 */

import { getAccountAdminStoreAdapter } from './serverAccountAdminAdapter';

export interface IpBlockRecord {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number; // 0 for indefinite
  blockedBy: string;
}

export interface SecurityIncident {
  id: string;
  timestamp: number;
  type: 'RATE_LIMIT_EXCEEDED' | 'SPOOFED_HEADER' | 'INVALID_AUTH_ATTEMPT' | 'BLOCKED_IP_ACCESS' | 'CSRF_FAILURE' | 'ADMIN_BRUTE_FORCE';
  ip: string;
  detail: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const MAX_INCIDENTS = 500;

const globalForSecurity = globalThis as unknown as {
  enclaveIpBlocks?: Map<string, IpBlockRecord>;
  enclaveIncidents?: SecurityIncident[];
};

export const ipBlockStore: Map<string, IpBlockRecord> =
  globalForSecurity.enclaveIpBlocks || new Map<string, IpBlockRecord>();

export const incidentStore: SecurityIncident[] =
  globalForSecurity.enclaveIncidents || [];

if (process.env.NODE_ENV !== 'production') {
  globalForSecurity.enclaveIpBlocks = ipBlockStore;
  globalForSecurity.enclaveIncidents = incidentStore;
}

/**
 * Checks if an IP is currently blocked (Async).
 */
export async function isIpBlockedAsync(ip: string): Promise<{ blocked: boolean; record?: IpBlockRecord }> {
  const adapter = getAccountAdminStoreAdapter();
  const record = await adapter.getIpBlock(ip);
  if (!record) return { blocked: false };

  if (record.expiresAt > 0 && Date.now() > record.expiresAt) {
    await adapter.deleteIpBlock(ip);
    ipBlockStore.delete(ip);
    return { blocked: false };
  }

  ipBlockStore.set(ip, record);
  return { blocked: true, record };
}

/**
 * Synchronous IP block check.
 */
export function isIpBlocked(ip: string): { blocked: boolean; record?: IpBlockRecord } {
  const record = ipBlockStore.get(ip);
  if (!record) return { blocked: false };

  // Check if expired
  if (record.expiresAt > 0 && Date.now() > record.expiresAt) {
    ipBlockStore.delete(ip);
    const adapter = getAccountAdminStoreAdapter();
    if (adapter.isDistributed) {
      Promise.resolve(adapter.deleteIpBlock(ip)).catch(() => {});
    }
    return { blocked: false };
  }

  return { blocked: true, record };
}

/**
 * Adds an IP block (Async).
 */
export async function blockIpAsync(
  ip: string,
  reason: string,
  durationMs: number = 3600000, // default 1 hour
  blockedBy: string = 'admin'
): Promise<IpBlockRecord> {
  const now = Date.now();
  const expiresAt = durationMs === 0 ? 0 : now + durationMs;
  const record: IpBlockRecord = {
    ip,
    reason,
    blockedAt: now,
    expiresAt,
    blockedBy
  };

  const adapter = getAccountAdminStoreAdapter();
  await adapter.saveIpBlock(record);
  ipBlockStore.set(ip, record);

  return record;
}

/**
 * Adds an IP block (Sync facade).
 */
export function blockIp(
  ip: string,
  reason: string,
  durationMs: number = 3600000, // default 1 hour
  blockedBy: string = 'admin'
): IpBlockRecord {
  const now = Date.now();
  const expiresAt = durationMs === 0 ? 0 : now + durationMs;
  const record: IpBlockRecord = {
    ip,
    reason,
    blockedAt: now,
    expiresAt,
    blockedBy
  };
  ipBlockStore.set(ip, record);

  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.saveIpBlock(record);
  } else {
    Promise.resolve(adapter.saveIpBlock(record)).catch((err) => {
      console.warn('[ENCLAVE SECURITY] Async error in sync blockIp:', err);
    });
  }

  return record;
}

/**
 * Unblocks an IP (Async).
 */
export async function unblockIpAsync(ip: string): Promise<boolean> {
  const adapter = getAccountAdminStoreAdapter();
  const deleted = await adapter.deleteIpBlock(ip);
  ipBlockStore.delete(ip);
  return deleted;
}

/**
 * Unblocks an IP (Sync facade).
 */
export function unblockIp(ip: string): boolean {
  const deleted = ipBlockStore.delete(ip);
  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.deleteIpBlock(ip);
  } else {
    Promise.resolve(adapter.deleteIpBlock(ip)).catch((err) => {
      console.warn('[ENCLAVE SECURITY] Async error in sync unblockIp:', err);
    });
  }
  return deleted;
}

/**
 * Returns all active blocked IPs (Async).
 */
export async function getAllBlockedIpsAsync(): Promise<IpBlockRecord[]> {
  const adapter = getAccountAdminStoreAdapter();
  const active = await adapter.listActiveIpBlocks();

  ipBlockStore.clear();
  for (const rec of active) {
    ipBlockStore.set(rec.ip, rec);
  }

  return active;
}

/**
 * Returns all active blocked IPs (Sync facade).
 */
export function getAllBlockedIps(): IpBlockRecord[] {
  const now = Date.now();
  const active: IpBlockRecord[] = [];
  for (const [ip, record] of ipBlockStore.entries()) {
    if (record.expiresAt > 0 && now > record.expiresAt) {
      ipBlockStore.delete(ip);
    } else {
      active.push(record);
    }
  }
  return active;
}

/**
 * Records a security incident (Async).
 */
export async function recordSecurityIncidentAsync(
  incident: Omit<SecurityIncident, 'id' | 'timestamp'>
): Promise<SecurityIncident> {
  const fullIncident: SecurityIncident = {
    ...incident,
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now()
  };

  const adapter = getAccountAdminStoreAdapter();
  await adapter.appendSecurityIncident(fullIncident);

  incidentStore.unshift(fullIncident);
  if (incidentStore.length > MAX_INCIDENTS) {
    incidentStore.pop();
  }

  return fullIncident;
}

/**
 * Records a security incident (Sync facade).
 */
export function recordSecurityIncident(
  incident: Omit<SecurityIncident, 'id' | 'timestamp'>
): SecurityIncident {
  const fullIncident: SecurityIncident = {
    ...incident,
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now()
  };

  incidentStore.unshift(fullIncident);
  if (incidentStore.length > MAX_INCIDENTS) {
    incidentStore.pop();
  }

  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.appendSecurityIncident(fullIncident);
  } else {
    Promise.resolve(adapter.appendSecurityIncident(fullIncident)).catch((err) => {
      console.warn('[ENCLAVE SECURITY] Async error in sync recordSecurityIncident:', err);
    });
  }

  return fullIncident;
}

/**
 * Gets recent security incidents (Async).
 */
export async function getRecentIncidentsAsync(limit = 50): Promise<SecurityIncident[]> {
  const adapter = getAccountAdminStoreAdapter();
  return await adapter.getRecentIncidents(limit);
}

/**
 * Gets recent security incidents (Sync facade).
 */
export function getRecentIncidents(limit = 50): SecurityIncident[] {
  return incidentStore.slice(0, limit);
}
