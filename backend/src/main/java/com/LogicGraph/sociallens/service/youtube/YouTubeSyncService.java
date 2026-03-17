package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.dto.youtube.SyncResultDto;

import java.time.Duration;
import java.util.Optional;

/**
 * Orchestrates the full channel sync pipeline: resolve → fetch → upsert → snapshot.
 * Does NOT call the YouTube Analytics API — that is {@code YtAnalyticsService}.
 */
public interface YouTubeSyncService {

    /**
     * Full sync for a channel identified by any supported identifier
     * (channel ID, @handle, URL, etc.).
     *
     * <ol>
     *   <li>Resolve identifier → upserted {@code YouTubeChannel}</li>
     *   <li>Fetch videos via {@link YouTubeService#fetchVideosByChannelId}</li>
     *   <li>Upsert each video into the {@code YouTubeVideo} table</li>
     *   <li>Write one new {@code ChannelMetricsSnapshot} (source = PUBLIC)</li>
     *   <li>Write one new {@code VideoMetricsSnapshot} per video (source = PUBLIC)</li>
     * </ol>
     *
     * @param identifier any channel identifier (UC..., @handle, full URL, etc.)
     * @return sync summary with video count, API calls used, and status
     */
    SyncResultDto syncChannel(String identifier);

    /**
     * Syncs the channel only when its most recent snapshot is older than the given threshold.
     *
     * @param channelId          YouTube channel ID (UC...)
     * @param stalenessThreshold skip sync if most recent snapshot is newer than this
     * @return the sync result, or empty if skipped because data is still fresh
     */
    Optional<SyncResultDto> syncChannelIfStale(String channelId, Duration stalenessThreshold);
}
