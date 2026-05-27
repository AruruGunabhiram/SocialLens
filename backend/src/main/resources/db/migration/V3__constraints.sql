-- =============================================================================
-- V3: Database integrity constraints
-- Adds a UNIQUE constraint on users.email and a FK from oauth_states.user_id
-- to users.id.  Both were missing from the V1 baseline.
--
-- ⚠  BEFORE RUNNING IN A DEV/STAGING ENVIRONMENT
-- ──────────────────────────────────────────────
-- 1. Duplicate emails in users
--    The UNIQUE constraint on users.email will fail if the table already
--    contains two rows with the same email address.
--    Check first:
--      SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
--    If duplicates exist, deduplicate before migrating (keep the oldest row):
--      DELETE FROM users
--        WHERE id NOT IN (
--          SELECT MIN(id) FROM users WHERE email IS NOT NULL GROUP BY email
--        )
--        AND email IS NOT NULL;
--
-- 2. Orphaned oauth_states rows
--    The FK from oauth_states.user_id → users.id will fail if any user_id
--    value in oauth_states does not exist in users.id.
--    Check first:
--      SELECT DISTINCT user_id FROM oauth_states
--        WHERE user_id NOT IN (SELECT id FROM users);
--    If orphans exist, remove them (or fix the parent rows) before migrating:
--      DELETE FROM oauth_states
--        WHERE user_id NOT IN (SELECT id FROM users);
--
-- NULL behaviour
-- ──────────────
-- • users.email is currently nullable.  PostgreSQL's UNIQUE constraint treats
--   each NULL as distinct, so multiple NULL emails are permitted — the
--   constraint only rejects duplicate non-NULL values.
-- • oauth_states.user_id is already NOT NULL (V1 baseline), so no NULL-related
--   edge case applies to the FK.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. UNIQUE constraint on users.email
--    Enforces one account per email address.
--    Named explicitly so it can be referenced clearly in error messages and
--    future migrations.
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD CONSTRAINT uk_users_email UNIQUE (email);

-- ---------------------------------------------------------------------------
-- 2. FK from oauth_states.user_id → users.id
--    Mirrors the same pattern already used on connected_accounts.user_id.
--    ON DELETE CASCADE: when a user row is deleted, their pending OAuth state
--    rows are cleaned up automatically, preventing dangling state tokens.
-- ---------------------------------------------------------------------------
ALTER TABLE oauth_states
    ADD CONSTRAINT fk_oauth_states_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE;
