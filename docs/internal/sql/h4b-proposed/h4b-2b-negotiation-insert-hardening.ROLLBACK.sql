-- =============================================================================
-- H4B.2b ROLLBACK — restore exact Production INSERT policies
-- MANUAL ONLY
-- Does not alter SELECT policies.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "negotiation_rooms_insert_authenticated_buyer_listing_owner"
  ON public.negotiation_rooms;

CREATE POLICY "Buyers can create negotiation rooms"
  ON public.negotiation_rooms
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "negotiation_messages_insert_authenticated_participant"
  ON public.negotiation_messages;

CREATE POLICY "Users can insert messages in their rooms"
  ON public.negotiation_messages
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = sender_id);

COMMIT;
