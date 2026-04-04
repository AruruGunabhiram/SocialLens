-- Speed up time-range queries on snapshot tables as row counts grow.
-- Both analytics endpoints filter by captured_day_utc (e.g. WHERE captured_day_utc >= :cutoff),
-- so a single-column index on each table avoids full-table scans.

CREATE INDEX IF NOT EXISTS idx_channel_snap_day ON channel_metrics_snapshot(captured_day_utc);
CREATE INDEX IF NOT EXISTS idx_video_snap_day   ON video_metrics_snapshot(captured_day_utc);
