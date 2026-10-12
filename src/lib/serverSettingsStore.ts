/**
 * ENCLAVE Admin Settings Store
 * Server-enforced runtime platform configuration with bounds validation and audit tracking.
 * Integrated with IAccountAdminStoreAdapter for distributed multi-instance persistence.
 */

import {
  getAccountAdminStoreAdapter,
  DEFAULT_PLATFORM_SETTINGS
} from './serverAccountAdminAdapter';

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  maxRoomLifetimeMs: number; // 60,000ms to 86,400,000ms (1 min to 24 hrs)
  waitingInactivityLimitMs: number; // 30,000ms to 1,800,000ms (30s to 30 mins)
  maxFileSizeMb: number; // 1MB to 100MB
  rateLimitMaxAttempts: number; // 1 to 20 attempts
  rateLimitLockoutMs: number; // 30,000ms to 3,600,000ms (30s to 1 hr)
  allowedMimeTypes: string[];
  updatedAt: number;
  updatedBy: string;
}

export { DEFAULT_PLATFORM_SETTINGS };

const globalForSettings = globalThis as unknown as {
  enclavePlatformSettings?: PlatformSettings;
};

export const currentSettings: PlatformSettings =
  globalForSettings.enclavePlatformSettings || { ...DEFAULT_PLATFORM_SETTINGS };

if (process.env.NODE_ENV !== 'production') {
  globalForSettings.enclavePlatformSettings = currentSettings;
}

/**
 * Validates settings updates against bounds.
 */
export function validateSettingsUpdates(updates: Partial<PlatformSettings>): { valid: boolean; error?: string } {
  if (updates.maxRoomLifetimeMs !== undefined) {
    if (updates.maxRoomLifetimeMs < 60000 || updates.maxRoomLifetimeMs > 86400000) {
      return { valid: false, error: 'Max room lifetime must be between 1 minute and 24 hours.' };
    }
  }

  if (updates.waitingInactivityLimitMs !== undefined) {
    if (updates.waitingInactivityLimitMs < 30000 || updates.waitingInactivityLimitMs > 1800000) {
      return { valid: false, error: 'Waiting inactivity limit must be between 30 seconds and 30 minutes.' };
    }
  }

  if (updates.maxFileSizeMb !== undefined) {
    if (updates.maxFileSizeMb < 1 || updates.maxFileSizeMb > 100) {
      return { valid: false, error: 'Max file size must be between 1 MB and 100 MB.' };
    }
  }

  if (updates.rateLimitMaxAttempts !== undefined) {
    if (updates.rateLimitMaxAttempts < 1 || updates.rateLimitMaxAttempts > 20) {
      return { valid: false, error: 'Rate limit attempts must be between 1 and 20.' };
    }
  }

  if (updates.rateLimitLockoutMs !== undefined) {
    if (updates.rateLimitLockoutMs < 30000 || updates.rateLimitLockoutMs > 3600000) {
      return { valid: false, error: 'Rate limit lockout must be between 30 seconds and 60 minutes.' };
    }
  }

  return { valid: true };
}

/**
 * Async adapter-integrated getter.
 * Pulls from shared distributed storage in production.
 */
export async function getPlatformSettingsAsync(): Promise<PlatformSettings> {
  const adapter = getAccountAdminStoreAdapter();
  const settings = await adapter.getPlatformSettings();
  if (!settings) {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
  // Sync in-memory copy
  Object.assign(currentSettings, settings);
  return { ...settings };
}

/**
 * Synchronous getter returning current cached/in-memory settings.
 */
export function getPlatformSettings(): PlatformSettings {
  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    const s = adapter.getPlatformSettings();
    if (s && !(s instanceof Promise)) {
      return { ...s };
    }
  }
  return { ...currentSettings };
}

/**
 * Async adapter-integrated updater.
 * Validates bounds and persists to shared distributed storage.
 */
export async function updatePlatformSettingsAsync(
  updates: Partial<PlatformSettings>,
  updatedBy: string
): Promise<{ success: boolean; settings: PlatformSettings; error?: string }> {
  const validation = validateSettingsUpdates(updates);
  if (!validation.valid) {
    return { success: false, settings: { ...currentSettings }, error: validation.error };
  }

  const existing = await getPlatformSettingsAsync();
  const nextSettings: PlatformSettings = { ...existing };

  if (updates.maintenanceMode !== undefined) {
    nextSettings.maintenanceMode = Boolean(updates.maintenanceMode);
  }
  if (updates.maintenanceNotice !== undefined) {
    nextSettings.maintenanceNotice = String(updates.maintenanceNotice).trim().slice(0, 500);
  }
  if (updates.maxRoomLifetimeMs !== undefined) {
    nextSettings.maxRoomLifetimeMs = updates.maxRoomLifetimeMs;
  }
  if (updates.waitingInactivityLimitMs !== undefined) {
    nextSettings.waitingInactivityLimitMs = updates.waitingInactivityLimitMs;
  }
  if (updates.maxFileSizeMb !== undefined) {
    nextSettings.maxFileSizeMb = updates.maxFileSizeMb;
  }
  if (updates.rateLimitMaxAttempts !== undefined) {
    nextSettings.rateLimitMaxAttempts = updates.rateLimitMaxAttempts;
  }
  if (updates.rateLimitLockoutMs !== undefined) {
    nextSettings.rateLimitLockoutMs = updates.rateLimitLockoutMs;
  }
  if (Array.isArray(updates.allowedMimeTypes)) {
    nextSettings.allowedMimeTypes = updates.allowedMimeTypes.filter(m => typeof m === 'string' && m.includes('/'));
  }

  nextSettings.updatedAt = Date.now();
  nextSettings.updatedBy = updatedBy;

  const adapter = getAccountAdminStoreAdapter();
  await adapter.savePlatformSettings(nextSettings);

  Object.assign(currentSettings, nextSettings);

  return { success: true, settings: { ...nextSettings } };
}

/**
 * Synchronous updater preserved for backward compatibility and synchronous callers.
 */
export function updatePlatformSettings(
  updates: Partial<PlatformSettings>,
  updatedBy: string
): { success: boolean; settings: PlatformSettings; error?: string } {
  const validation = validateSettingsUpdates(updates);
  if (!validation.valid) {
    return { success: false, settings: currentSettings, error: validation.error };
  }

  if (updates.maintenanceMode !== undefined) {
    currentSettings.maintenanceMode = Boolean(updates.maintenanceMode);
  }
  if (updates.maintenanceNotice !== undefined) {
    currentSettings.maintenanceNotice = String(updates.maintenanceNotice).trim().slice(0, 500);
  }
  if (updates.maxRoomLifetimeMs !== undefined) {
    currentSettings.maxRoomLifetimeMs = updates.maxRoomLifetimeMs;
  }
  if (updates.waitingInactivityLimitMs !== undefined) {
    currentSettings.waitingInactivityLimitMs = updates.waitingInactivityLimitMs;
  }
  if (updates.maxFileSizeMb !== undefined) {
    currentSettings.maxFileSizeMb = updates.maxFileSizeMb;
  }
  if (updates.rateLimitMaxAttempts !== undefined) {
    currentSettings.rateLimitMaxAttempts = updates.rateLimitMaxAttempts;
  }
  if (updates.rateLimitLockoutMs !== undefined) {
    currentSettings.rateLimitLockoutMs = updates.rateLimitLockoutMs;
  }
  if (Array.isArray(updates.allowedMimeTypes)) {
    currentSettings.allowedMimeTypes = updates.allowedMimeTypes.filter(m => typeof m === 'string' && m.includes('/'));
  }

  currentSettings.updatedAt = Date.now();
  currentSettings.updatedBy = updatedBy;

  const adapter = getAccountAdminStoreAdapter();
  if (!adapter.isDistributed) {
    adapter.savePlatformSettings(currentSettings);
  } else {
    // Fire and forget promise for distributed adapter when called synchronously
    Promise.resolve(adapter.savePlatformSettings({ ...currentSettings })).catch((err) => {
      console.warn('[ENCLAVE SETTINGS] Async persist error in sync updatePlatformSettings:', err);
    });
  }

  return { success: true, settings: { ...currentSettings } };
}
