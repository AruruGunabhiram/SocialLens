-- =============================================================================
-- V1: Baseline schema
-- Captures the full schema as of the initial backend hardening release.
-- All subsequent schema changes must be versioned as V2, V3, etc.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL PRIMARY KEY,
    email      VARCHAR(255),
    name       VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- youtube_channel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS youtube_channel (
    id                          BIGSERIAL PRIMARY KEY,
    channel_id                  VARCHAR(255) NOT NULL UNIQUE,
    handle                      VARCHAR(255),
    title                       VARCHAR(255),
    description                 TEXT,
    published_at                TIMESTAMPTZ,
    country                     VARCHAR(255),
    thumbnail_url               VARCHAR(255),
    last_video_sync_at          TIMESTAMPTZ,
    last_successful_refresh_at  TIMESTAMPTZ,
    last_refresh_status         VARCHAR(50)  NOT NULL DEFAULT 'NEVER_RUN',
    last_refresh_error          TEXT,
    subscriber_count            BIGINT,
    view_count                  BIGINT,
    video_count                 BIGINT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active                      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_youtube_channel_channel_id ON youtube_channel (channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channel_handle     ON youtube_channel (handle);

-- ---------------------------------------------------------------------------
-- youtube_video
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS youtube_video (
    id                 BIGSERIAL PRIMARY KEY,
    youtube_channel_id BIGINT       NOT NULL REFERENCES youtube_channel (id),
    video_id           VARCHAR(255) NOT NULL UNIQUE,
    title              VARCHAR(255),
    description        TEXT,
    published_at       TIMESTAMPTZ,
    duration           VARCHAR(50),
    category_id        VARCHAR(50),
    thumbnail_url      VARCHAR(512),
    tags               TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    view_count         BIGINT,
    like_count         BIGINT,
    comment_count      BIGINT,
    active             BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_youtube_video_video_id    ON youtube_video (video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_video_channel_fk ON youtube_video (youtube_channel_id);

-- ---------------------------------------------------------------------------
-- channel_metrics_snapshot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_metrics_snapshot (
    id               BIGSERIAL PRIMARY KEY,
    channel_id       BIGINT      NOT NULL REFERENCES youtube_channel (id),
    subscriber_count BIGINT,
    view_count       BIGINT,
    video_count      BIGINT,
    captured_at      TIMESTAMPTZ NOT NULL,
    captured_day_utc DATE        NOT NULL,
    source           VARCHAR(50) NOT NULL,
    CONSTRAINT uk_channel_snapshot_day UNIQUE (channel_id, captured_day_utc)
);

-- ---------------------------------------------------------------------------
-- video_metrics_snapshot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_metrics_snapshot (
    id               BIGSERIAL PRIMARY KEY,
    video_id         BIGINT      NOT NULL REFERENCES youtube_video (id),
    view_count       BIGINT,
    like_count       BIGINT,
    comment_count    BIGINT,
    favorite_count   BIGINT,
    captured_at      TIMESTAMPTZ NOT NULL,
    captured_day_utc DATE        NOT NULL,
    source           VARCHAR(50) NOT NULL,
    CONSTRAINT uk_video_snapshot_day UNIQUE (video_id, captured_day_utc)
);

-- ---------------------------------------------------------------------------
-- connected_accounts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connected_accounts (
    id                        BIGSERIAL PRIMARY KEY,
    user_id                   BIGINT       NOT NULL REFERENCES users (id),
    platform                  VARCHAR(50)  NOT NULL,
    channel_id                VARCHAR(255),
    access_token              TEXT,
    refresh_token             TEXT,
    expires_at                TIMESTAMPTZ,
    scopes                    TEXT,
    status                    VARCHAR(50),
    disconnect_reason         TEXT,
    last_analytics_refresh_at TIMESTAMPTZ,
    last_refreshed_at         TIMESTAMPTZ,
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_connected_account_user_platform UNIQUE (user_id, platform)
);

-- ---------------------------------------------------------------------------
-- oauth_states
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_states (
    id         BIGSERIAL PRIMARY KEY,
    state      VARCHAR(255) NOT NULL UNIQUE,
    user_id    BIGINT       NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- hashtag + video_hashtag
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hashtag (
    id  BIGSERIAL PRIMARY KEY,
    tag VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS video_hashtag (
    id         BIGSERIAL PRIMARY KEY,
    video_id   BIGINT NOT NULL REFERENCES youtube_video (id),
    hashtag_id BIGINT NOT NULL REFERENCES hashtag (id),
    CONSTRAINT uq_video_hashtag UNIQUE (video_id, hashtag_id)
);
