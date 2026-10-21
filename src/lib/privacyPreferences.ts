/**
 * ENCLAVE Privacy Preferences
 * User-configurable privacy controls for:
 * 1. Read receipts
 * 2. Typing indicators
 * 3. Notification previews (disabled by default to prevent leaking plaintext in OS/browser notifications)
 */

export interface PrivacyPreferences {
  readReceipts: boolean;
  typingIndicators: boolean;
  notificationPreviews: boolean;
}

const STORAGE_KEY = 'enclave_privacy_preferences';

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  readReceipts: true,
  typingIndicators: true,
  notificationPreviews: false // Default to highest privacy: zero content leaked in background previews
};

const listeners = new Set<(prefs: PrivacyPreferences) => void>();
let inMemoryPrefs: PrivacyPreferences = { ...DEFAULT_PRIVACY_PREFERENCES };

export function getPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === 'undefined') {
    return { ...inMemoryPrefs };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY_PREFERENCES };
    const parsed = JSON.parse(raw);
    return {
      readReceipts: typeof parsed.readReceipts === 'boolean' ? parsed.readReceipts : DEFAULT_PRIVACY_PREFERENCES.readReceipts,
      typingIndicators: typeof parsed.typingIndicators === 'boolean' ? parsed.typingIndicators : DEFAULT_PRIVACY_PREFERENCES.typingIndicators,
      notificationPreviews: typeof parsed.notificationPreviews === 'boolean' ? parsed.notificationPreviews : DEFAULT_PRIVACY_PREFERENCES.notificationPreviews
    };
  } catch {
    return { ...DEFAULT_PRIVACY_PREFERENCES };
  }
}

export function setPrivacyPreferences(updates: Partial<PrivacyPreferences>): PrivacyPreferences {
  const current = getPrivacyPreferences();
  const next: PrivacyPreferences = {
    ...current,
    ...updates
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  } else {
    inMemoryPrefs = { ...next };
  }

  listeners.forEach(fn => {
    try {
      fn(next);
    } catch {}
  });

  return next;
}

export function onPrivacyPreferencesChange(fn: (prefs: PrivacyPreferences) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function savePrivacyPreferences(updates: Partial<PrivacyPreferences>): PrivacyPreferences {
  return setPrivacyPreferences(updates);
}

export function resetPrivacyPreferences(): PrivacyPreferences {
  return setPrivacyPreferences(DEFAULT_PRIVACY_PREFERENCES);
}

