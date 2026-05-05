-- Enable extensions Outflow needs at first boot of a fresh Postgres volume.
-- citext: case-insensitive emails (no LOWER() everywhere)
-- pg_trgm: fuzzy text search later (vendor name matching)
-- pgcrypto: gen_random_uuid()
-- vector: pgvector for Lookback (and any embedding work in Outflow)
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
