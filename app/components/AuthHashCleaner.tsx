"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { hasAuthTokensInHash, stripAuthHashFromUrl } from "@/lib/authUrl";

/**
 * Curăță #access_token / #refresh_token din URL după ce Supabase confirmă sesiunea.
 * Montat global în layout — insesizabil pentru utilizator.
 */
export default function AuthHashCleaner() {
  useEffect(() => {
    const cleanIfSessionAndHash = (hasSession: boolean) => {
      if (hasSession && hasAuthTokensInHash()) {
        stripAuthHashFromUrl();
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      cleanIfSessionAndHash(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        cleanIfSessionAndHash(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
