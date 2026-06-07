"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isEvaluateTurnstileUiEnabled } from "@/lib/turnstilePublic";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __quickexitTurnstileLoadPromise?: Promise<void>;
  }
}

export type EvaluateTurnstileHandle = {
  reset: () => void;
  getToken: () => string | null;
};

type EvaluateTurnstileProps = {
  onTokenChange?: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (window.__quickexitTurnstileLoadPromise) {
    return window.__quickexitTurnstileLoadPromise;
  }

  window.__quickexitTurnstileLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile_script_error")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile_script_error"));
    document.head.appendChild(script);
  });

  return window.__quickexitTurnstileLoadPromise;
}

const EvaluateTurnstile = forwardRef<EvaluateTurnstileHandle, EvaluateTurnstileProps>(
  function EvaluateTurnstile({ onTokenChange, theme = "light", className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string | null>(null);
    const [loadError, setLoadError] = useState(false);

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

    const setToken = (value: string | null) => {
      tokenRef.current = value;
      onTokenChange?.(value);
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        setToken(null);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      getToken: () => tokenRef.current,
    }));

    useEffect(() => {
      if (!siteKey || !containerRef.current) return;

      let cancelled = false;

      void loadTurnstileScript()
        .then(() => {
          if (cancelled || !containerRef.current || !window.turnstile) return;

          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size: "flexible",
            callback: (token) => setToken(token),
            "expired-callback": () => setToken(null),
            "error-callback": () => setToken(null),
          });
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme]);

    if (!isEvaluateTurnstileUiEnabled()) {
      return null;
    }

    return (
      <div className={className}>
        <div ref={containerRef} className="min-h-[65px]" />
        {loadError && (
          <p className="mt-2 text-xs font-semibold text-red-800">
            Verificarea de securitate nu s-a încărcat. Reîncarcă pagina și încearcă din nou.
          </p>
        )}
      </div>
    );
  },
);

export default EvaluateTurnstile;
