"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { applyConsentPreferences } from "@/lib/analytics";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_PREFERENCES_EVENT,
  readConsentPreferences,
  type ConsentChoiceInput,
  type ConsentPreferences,
} from "@/lib/consentPreferences";
import {
  applyConsentTags,
  shouldReloadToUnloadTags,
} from "@/lib/consentTags";

type ConsentContextValue = {
  preferences: ConsentPreferences | null;
  bannerVisible: boolean;
  preferencesOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  openPreferences: () => void;
  closePreferences: () => void;
  savePreferences: (input: ConsentChoiceInput) => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

let cachedPreferences: ConsentPreferences | null | undefined;

function consentEqual(
  a: ConsentPreferences | null,
  b: ConsentPreferences | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.version === b.version &&
    a.timestamp === b.timestamp &&
    a.analytics === b.analytics &&
    a.marketing === b.marketing
  );
}

function getConsentSnapshot(): ConsentPreferences | null {
  const next = readConsentPreferences();
  if (cachedPreferences !== undefined && consentEqual(cachedPreferences, next)) {
    return cachedPreferences;
  }
  cachedPreferences = next;
  return cachedPreferences;
}

function subscribeConsent(onStoreChange: () => void): () => void {
  const handler = () => {
    cachedPreferences = undefined;
    onStoreChange();
  };
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
}

function subscribeClient(): () => void {
  return () => undefined;
}

function commitPreferences(input: ConsentChoiceInput): ConsentPreferences {
  const previous = readConsentPreferences();
  const next = applyConsentPreferences(input);
  if (shouldReloadToUnloadTags(previous, next)) {
    window.location.reload();
    return next;
  }
  applyConsentTags(next);
  return next;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(subscribeClient, () => true, () => false);
  const preferences = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    () => null,
  );
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    if (!isClient || !preferences) return;
    applyConsentTags(preferences);
  }, [isClient, preferences]);

  useEffect(() => {
    if (!isClient) return;
    const onOpen = () => setPreferencesOpen(true);
    window.addEventListener(CONSENT_OPEN_PREFERENCES_EVENT, onOpen);
    window.quickexitSetConsentPreferences = (input) => {
      commitPreferences(input);
    };
    window.quickexitGetConsentPreferences = () => readConsentPreferences();
    window.quickexitSetAnalyticsConsent = (state) => {
      const existing = readConsentPreferences();
      commitPreferences({
        analytics: state === "granted",
        marketing: state === "granted" ? Boolean(existing?.marketing) : false,
      });
    };
    window.quickexitRevokeAnalyticsConsent = () => {
      commitPreferences({ analytics: false, marketing: false });
    };
    return () => {
      window.removeEventListener(CONSENT_OPEN_PREFERENCES_EVENT, onOpen);
      delete window.quickexitSetConsentPreferences;
      delete window.quickexitGetConsentPreferences;
      delete window.quickexitSetAnalyticsConsent;
      delete window.quickexitRevokeAnalyticsConsent;
    };
  }, [isClient]);

  const acceptAll = useCallback(() => {
    setPreferencesOpen(false);
    commitPreferences({ analytics: true, marketing: true });
  }, []);

  const rejectOptional = useCallback(() => {
    setPreferencesOpen(false);
    commitPreferences({ analytics: false, marketing: false });
  }, []);

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setPreferencesOpen(false);
  }, []);

  const savePreferences = useCallback((input: ConsentChoiceInput) => {
    setPreferencesOpen(false);
    commitPreferences(input);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      preferences,
      bannerVisible: isClient && preferences === null,
      preferencesOpen,
      acceptAll,
      rejectOptional,
      openPreferences,
      closePreferences,
      savePreferences,
    }),
    [
      preferences,
      isClient,
      preferencesOpen,
      acceptAll,
      rejectOptional,
      openPreferences,
      closePreferences,
      savePreferences,
    ],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}
