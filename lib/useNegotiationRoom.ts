"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type NegotiationMessage = {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
};

export type NegotiationListingSummary = {
  id: string;
  title: string | null;
  exit_price: number | null;
  images: string[] | null;
};

type UseNegotiationRoomResult = {
  messages: NegotiationMessage[];
  listing: NegotiationListingSummary | null;
  currentUserId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<boolean>;
};

/**
 * Abonare în timp real la mesajele unei camere de negociere.
 * - Încarcă mesajele existente + activul (din `listings`).
 * - Se abonează la INSERT pe `negotiation_messages` filtrat pe `room_id`.
 * - Trimite mesaje noi cu `sender_id` = utilizatorul logat.
 */
export function useNegotiationRoom(roomId: string | null): UseNegotiationRoomResult {
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [listing, setListing] = useState<NegotiationListingSummary | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reținem id-urile mesajelor deja afișate pentru a evita dublurile (optimist + realtime).
  const seenIdsRef = useRef<Set<string>>(new Set());

  const appendMessage = useCallback((msg: NegotiationMessage) => {
    if (!msg?.id || seenIdsRef.current.has(msg.id)) return;
    seenIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Încărcare inițială: user, cameră, activ, mesaje.
  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);
    seenIdsRef.current = new Set();
    setMessages([]);

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (active) setCurrentUserId(user?.id ?? null);

        const { data: room, error: roomError } = await supabase
          .from("negotiation_rooms")
          .select("id, listing_id")
          .eq("id", roomId)
          .maybeSingle();

        if (roomError) throw roomError;

        const listingId =
          room && typeof room.listing_id === "string" ? room.listing_id : null;

        if (listingId) {
          const { data: listingData } = await supabase
            .from("listings")
            .select("id, title, exit_price, images")
            .eq("id", listingId)
            .maybeSingle();
          if (active && listingData) {
            setListing(listingData as NegotiationListingSummary);
          }
        }

        const { data: existing, error: messagesError } = await supabase
          .from("negotiation_messages")
          .select("id, room_id, sender_id, content, created_at")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        if (active && Array.isArray(existing)) {
          const normalized = existing as NegotiationMessage[];
          seenIdsRef.current = new Set(normalized.map((m) => m.id));
          setMessages(normalized);
        }
      } catch (err) {
        console.error("[negociere] Eroare încărcare cameră:", err);
        if (active) setError("Nu am putut încărca conversația. Reîncearcă.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [roomId]);

  // Abonare realtime la mesaje noi pentru această cameră.
  useEffect(() => {
    if (!roomId) return;

    const channel: RealtimeChannel = supabase
      .channel(`negotiation_room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "negotiation_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          appendMessage(payload.new as NegotiationMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, appendMessage]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !roomId) return false;

      setIsSending(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Trebuie să fii autentificat pentru a trimite mesaje.");
          return false;
        }

        const { data, error: insertError } = await supabase
          .from("negotiation_messages")
          .insert({
            room_id: roomId,
            sender_id: user.id,
            content: trimmed,
          })
          .select("id, room_id, sender_id, content, created_at")
          .single();

        if (insertError) throw insertError;

        // Afișare optimistă imediată; realtime va fi deduplicat după id.
        if (data) appendMessage(data as NegotiationMessage);
        return true;
      } catch (err) {
        console.error("[negociere] Eroare trimitere mesaj:", err);
        setError("Mesajul nu a putut fi trimis. Reîncearcă.");
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [roomId, appendMessage]
  );

  return {
    messages,
    listing,
    currentUserId,
    isLoading,
    isSending,
    error,
    sendMessage,
  };
}
