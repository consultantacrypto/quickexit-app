-- =============================================================================
-- H4B.2b — canonical negotiation INSERT hardening + Production SELECT truth
-- INSERT: applied 2026-10-10 (h4b-2b-negotiation-insert-hardening.sql)
-- SELECT: production-truth policy names/expressions
-- No client UPDATE/DELETE policies.
-- Rollback INSERT: docs/internal/sql/h4b-proposed/h4b-2b-negotiation-insert-hardening.ROLLBACK.sql
-- =============================================================================

BEGIN;

ALTER TABLE public.negotiation_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.negotiation_rooms TO authenticated;
GRANT SELECT ON public.negotiation_rooms TO anon;
GRANT SELECT, INSERT ON public.negotiation_messages TO authenticated;
GRANT SELECT ON public.negotiation_messages TO anon;

-- SELECT (Production)
DROP POLICY IF EXISTS "Users can view their own negotiation rooms" ON public.negotiation_rooms;
CREATE POLICY "Users can view their own negotiation rooms"
  ON public.negotiation_rooms
  FOR SELECT
  TO public
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.negotiation_messages;
CREATE POLICY "Users can view messages in their rooms"
  ON public.negotiation_messages
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiation_rooms r
      WHERE r.id = negotiation_messages.room_id
        AND (auth.uid() = r.buyer_id OR auth.uid() = r.seller_id)
    )
  );

-- INSERT (H4B.2b final — replace legacy public inserts)
DROP POLICY IF EXISTS "Buyers can create negotiation rooms" ON public.negotiation_rooms;
DROP POLICY IF EXISTS "negotiation_rooms_insert_authenticated_buyer_listing_owner"
  ON public.negotiation_rooms;

CREATE POLICY "negotiation_rooms_insert_authenticated_buyer_listing_owner"
  ON public.negotiation_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = negotiation_rooms.listing_id
        AND l.user_id = negotiation_rooms.seller_id
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.negotiation_messages;
DROP POLICY IF EXISTS "negotiation_messages_insert_authenticated_participant"
  ON public.negotiation_messages;

CREATE POLICY "negotiation_messages_insert_authenticated_participant"
  ON public.negotiation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.negotiation_rooms r
      WHERE r.id = negotiation_messages.room_id
        AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
  );

COMMIT;
