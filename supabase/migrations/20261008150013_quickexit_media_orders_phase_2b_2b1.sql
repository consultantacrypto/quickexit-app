-- =============================================================================
-- HISTORICAL VERSION MARKER (Production schema_migrations row)
-- version: 20261008150013
-- name:    quickexit_media_orders_phase_2b_2b1
--
-- Production originally recorded this migration after listings already existed.
-- Canonical DDL for fresh databases is:
--   20261010120200_quickexit_media_orders_phase_2b_2b1.sql
-- (placed after H4B.0 so public.listings exists for FK).
--
-- This file is intentionally a NO-OP so:
--   - Production history can stay aligned with the recorded version
--   - Fresh installs do not attempt CREATE TABLE before listings exists
--   - No duplicate migration-history semantics for the same DDL body
--
-- DO NOT add DDL here.
-- Phase 4B.2 bookkeeping alignment.
-- =============================================================================

SELECT 1;
