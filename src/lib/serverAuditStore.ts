/**
 * ENCLAVE Admin Audit Log Store
 * Append-only storage for privileged administrative actions.
 * Zero plaintext message retention — records operational and security events only.
 * Integrated with IAccountAdminStoreAdapter for centralized multi-instance audit logging.
 */

import { getAccountAdminStoreAdapter } from './serverAccountAdminAdapter';

export interface AuditEvent {
  id: string;
  timestamp: number;
  adminUser: string;
  action: string;
  target?: string;
  reason?: string;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  metadata?: Record<string, unknown>;
  ip: string;
}

const MAX_AUDIT_LOGS = 1000;

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.ENCLAVE_DATA_DIR
  ? path.resolve(process.env.ENCLAVE_DATA_DIR)
  : path.join(process.cwd(), '.enclave-data');
const AUDIT_FILE_PATH = path.join(DATA_DIR, 'audit.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[ENCLAVE AUDIT STORE] Could not initialize data directory:', err);
  }
}

function loadPersistedAuditLogs(): void {
  try {
    ensureDataDir();
    if (fs.existsSync(AUDIT_FILE_PATH)) {
      const raw = fs.readFileSync(AUDIT_FILE_PATH, 'utf-8');
      if (raw.trim()) {
        const parsed: AuditEvent[] = JSON.parse(raw);
        auditStore.length = 0;
        auditStore.push(...parsed.slice(0, MAX_AUDIT_LOGS));
      }
    }
  } catch (err) {
    console.warn('[ENCLAVE AUDIT STORE] Error reading persisted audit log:', err);
  }
}

export function persistAuditLogsToDisk(): void {
  try {
    ensureDataDir();
    const tempPath = `${AUDIT_FILE_PATH}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(auditStore, null, 2), 'utf-8');
    try {
      fs.renameSync(tempPath, AUDIT_FILE_PATH);
    } catch {
      // Windows / OneDrive fallback when destination file is locked by sync indexer
      fs.copyFileSync(tempPath, AUDIT_FILE_PATH);
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
  } catch (err) {
    console.warn('[ENCLAVE AUDIT STORE] Error persisting audit logs to disk:', err);
  }
}

const globalForAdmin = globalThis as unknown as {
  enclaveAuditStore?: AuditEvent[];
};

export const auditStore: AuditEvent[] = globalForAdmin.enclaveAuditStore || [];
if (process.env.NODE_ENV !== 'production') {
  globalForAdmin.enclaveAuditStore = auditStore;
}

// Load on bootstrap for offline dev
if (process.env.NODE_ENV !== 'production') {
  loadPersistedAuditLogs();
}

/**
 * Appends a new verified audit event to the append-only log (Async).
 */
export async function recordAuditEventAsync(
  event: Omit<AuditEvent, 'id' | 'timestamp'>
): Promise<AuditEvent> {
  const fullEvent: AuditEvent = {
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now()
  };

  const adapter = getAccountAdminStoreAdapter();
  await adapter.appendAuditLog(fullEvent);

  auditStore.unshift(fullEvent);
  if (auditStore.length > MAX_AUDIT_LOGS) {
    auditStore.pop();
  }

  if (process.env.NODE_ENV !== 'production') {
    persistAuditLogsToDisk();
  }

  return fullEvent;
}

/**
 * Appends a new verified audit event to the append-only log (Sync facade).
 */
export function recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const fullEvent: AuditEvent = {
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now()
  };

  auditStore.unshift(fullEvent); // newest first
  if (auditStore.length > MAX_AUDIT_LOGS) {
    auditStore.pop();
  }

  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.appendAuditLog(fullEvent);
    if (process.env.NODE_ENV !== 'production') {
      persistAuditLogsToDisk();
    }
  } else {
    Promise.resolve(adapter.appendAuditLog(fullEvent)).catch((err) => {
      console.warn('[ENCLAVE AUDIT STORE] Async error in sync recordAuditEvent:', err);
    });
  }

  return fullEvent;
}

/**
 * Retrieves audit logs with optional filtering and pagination (Async).
 */
export async function getAuditLogsAsync(options?: {
  limit?: number;
  offset?: number;
  action?: string;
  adminUser?: string;
  status?: 'SUCCESS' | 'FAILED' | 'REJECTED';
}): Promise<{ logs: AuditEvent[]; total: number }> {
  const adapter = getAccountAdminStoreAdapter();
  return await adapter.getAuditLogs(options);
}

/**
 * Retrieves audit logs with optional filtering and pagination (Sync facade).
 */
export function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  action?: string;
  adminUser?: string;
  status?: 'SUCCESS' | 'FAILED' | 'REJECTED';
}): { logs: AuditEvent[]; total: number } {
  const { limit = 50, offset = 0, action, adminUser, status } = options || {};

  let filtered = auditStore;

  if (action) {
    filtered = filtered.filter(log => log.action.toLowerCase().includes(action.toLowerCase()));
  }
  if (adminUser) {
    filtered = filtered.filter(log => log.adminUser.toLowerCase() === adminUser.toLowerCase());
  }
  if (status) {
    filtered = filtered.filter(log => log.status === status);
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total: filtered.length
  };
}
