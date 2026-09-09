-- Listing structured location (OPTIONAL, not applied remotely).
-- Safe staged migration: nullable columns only. NO NOT NULL.
-- Application stores the same fields in listings.details JSON so the app
-- works before this SQL is applied.
--
-- Do NOT run against production from this change set.

alter table public.listings
  add column if not exists country_code text,
  add column if not exists county text,
  add column if not exists city text,
  add column if not exists district text;

comment on column public.listings.country_code is 'ISO 3166-1 alpha-2. Default RO. Nullable until legacy rows are backfilled.';
comment on column public.listings.county is 'Administrative area / județ. Nullable until legacy rows are backfilled.';
comment on column public.listings.city is 'City / locality. Nullable until legacy rows are backfilled.';
comment on column public.listings.district is 'Optional district / neighborhood (e.g. Sector 1). Never a street address.';

create index if not exists listings_public_location_idx
  on public.listings (status, is_seed, county, city)
  where status = 'active' and is_seed = false;

-- Optional later sync from details JSON (run only after reviewing the missing-location report):
-- update public.listings
-- set
--   country_code = coalesce(country_code, details->>'country_code'),
--   county = coalesce(county, details->>'county'),
--   city = coalesce(city, details->>'city'),
--   district = coalesce(district, details->>'district')
-- where details ? 'county' and details ? 'city';
