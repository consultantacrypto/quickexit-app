-- NEEXECUTAT. Do not apply to Production from this session.
-- Additive listing preference only. No wallet, network, rate, or payment columns.
-- Persisted crypto_assets must be strictly ascending lexicographically.
-- That ordering is what rejects duplicates and NULL elements inside the CHECK.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN crypto_payment_mode text NOT NULL DEFAULT 'none';

ALTER TABLE public.listings
  ADD COLUMN crypto_assets text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.listings
  ADD CONSTRAINT listings_crypto_payment_check
  CHECK (
    (
      crypto_payment_mode = 'none'
      AND cardinality(crypto_assets) = 0
    )
    OR (
      crypto_payment_mode IN ('full', 'partial', 'negotiable')
      AND cardinality(crypto_assets) BETWEEN 1 AND 7
      AND crypto_assets <@ ARRAY['usdc','usdt','btc','eth','bnb','xrp','sol']::text[]
      AND (
        (cardinality(crypto_assets) = 1 AND crypto_assets[1] IS NOT NULL)
        OR (cardinality(crypto_assets) = 2 AND crypto_assets[1] < crypto_assets[2])
        OR (
          cardinality(crypto_assets) = 3
          AND crypto_assets[1] < crypto_assets[2]
          AND crypto_assets[2] < crypto_assets[3]
        )
        OR (
          cardinality(crypto_assets) = 4
          AND crypto_assets[1] < crypto_assets[2]
          AND crypto_assets[2] < crypto_assets[3]
          AND crypto_assets[3] < crypto_assets[4]
        )
        OR (
          cardinality(crypto_assets) = 5
          AND crypto_assets[1] < crypto_assets[2]
          AND crypto_assets[2] < crypto_assets[3]
          AND crypto_assets[3] < crypto_assets[4]
          AND crypto_assets[4] < crypto_assets[5]
        )
        OR (
          cardinality(crypto_assets) = 6
          AND crypto_assets[1] < crypto_assets[2]
          AND crypto_assets[2] < crypto_assets[3]
          AND crypto_assets[3] < crypto_assets[4]
          AND crypto_assets[4] < crypto_assets[5]
          AND crypto_assets[5] < crypto_assets[6]
        )
        OR (
          cardinality(crypto_assets) = 7
          AND crypto_assets[1] < crypto_assets[2]
          AND crypto_assets[2] < crypto_assets[3]
          AND crypto_assets[3] < crypto_assets[4]
          AND crypto_assets[4] < crypto_assets[5]
          AND crypto_assets[5] < crypto_assets[6]
          AND crypto_assets[6] < crypto_assets[7]
        )
      )
    )
  );

COMMIT;

-- Rollback, manual, only after this file has been applied:
-- BEGIN;
-- ALTER TABLE public.listings DROP CONSTRAINT listings_crypto_payment_check;
-- ALTER TABLE public.listings DROP COLUMN crypto_assets;
-- ALTER TABLE public.listings DROP COLUMN crypto_payment_mode;
-- COMMIT;
