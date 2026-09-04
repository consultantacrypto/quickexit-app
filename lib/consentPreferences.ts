export const CONSENT_PREFERENCES_STORAGE_KEY = "quickexit_consent_preferences";
/** @deprecated migrated into CONSENT_PREFERENCES_STORAGE_KEY */
export const LEGACY_ANALYTICS_CONSENT_STORAGE_KEY = "quickexit_analytics_consent";
export const CONSENT_PREFERENCES_VERSION = 1 as const;

export const CONSENT_CHANGE_EVENT = "quickexit-consent-change";
export const CONSENT_OPEN_PREFERENCES_EVENT = "quickexit-open-consent";

export type ConsentPreferences = {
  version: typeof CONSENT_PREFERENCES_VERSION;
  timestamp: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentChoiceInput = {
  analytics: boolean;
  marketing: boolean;
  timestamp?: number;
};

export type GoogleConsentUpdate = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

export function buildConsentPreferences(input: ConsentChoiceInput): ConsentPreferences {
  return {
    version: CONSENT_PREFERENCES_VERSION,
    timestamp:
      typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
        ? input.timestamp
        : Date.now(),
    necessary: true,
    analytics: Boolean(input.analytics),
    marketing: Boolean(input.marketing),
  };
}

export function parseConsentPreferences(raw: unknown): ConsentPreferences | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (Number(value.version) !== CONSENT_PREFERENCES_VERSION) return null;
  if (value.necessary !== true) return null;
  if (typeof value.analytics !== "boolean") return null;
  if (typeof value.marketing !== "boolean") return null;
  const timestamp = Number(value.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return buildConsentPreferences({
    analytics: value.analytics,
    marketing: value.marketing,
    timestamp,
  });
}

export function migrateLegacyAnalyticsConsentValue(
  raw: string | null,
): ConsentPreferences | null {
  if (raw === "granted") {
    return buildConsentPreferences({ analytics: true, marketing: false });
  }
  if (raw === "denied") {
    return buildConsentPreferences({ analytics: false, marketing: false });
  }
  return null;
}

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // best-effort
  }
}

function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readConsentPreferences(): ConsentPreferences | null {
  const stored = storageGet(CONSENT_PREFERENCES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = parseConsentPreferences(JSON.parse(stored));
      if (parsed) return parsed;
    } catch {
      // fall through to legacy
    }
  }

  const migrated = migrateLegacyAnalyticsConsentValue(
    storageGet(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY),
  );
  if (!migrated) return null;
  persistConsentPreferences(migrated);
  storageRemove(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY);
  return migrated;
}

export function persistConsentPreferences(prefs: ConsentPreferences): void {
  storageSet(CONSENT_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  storageRemove(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY);
}

export function hasChosenConsent(): boolean {
  return readConsentPreferences() !== null;
}

export function hasAnalyticsConsent(): boolean {
  return readConsentPreferences()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return readConsentPreferences()?.marketing === true;
}

export function googleConsentUpdateFromPreferences(
  prefs: ConsentPreferences | null,
): GoogleConsentUpdate {
  const analytics = prefs?.analytics === true;
  const marketing = prefs?.marketing === true;
  return {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  };
}

export function emitConsentChange(prefs: ConsentPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGE_EVENT, { detail: prefs }),
    );
  } catch {
    // ignore
  }
}

export function emitOpenConsentPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(CONSENT_OPEN_PREFERENCES_EVENT));
  } catch {
    // ignore
  }
}
