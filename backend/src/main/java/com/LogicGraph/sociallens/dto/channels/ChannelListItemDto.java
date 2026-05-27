package com.LogicGraph.sociallens.dto.channels;

import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChannelListItemDto {

    public Long id;
    public String title;
    public String handle;
    public String channelId;
    public boolean active;
    public Instant lastSuccessfulRefreshAt;
    public RefreshStatus lastRefreshStatus;
    /** Error message from the most recent failed refresh job; null when last job succeeded. */
    public String lastRefreshError;
    /** capturedAt of the most recent ChannelMetricsSnapshot; null if none exists yet. */
    public Instant lastSnapshotAt;
    /** Total number of distinct snapshot days captured for this channel. */
    public Long snapshotDayCount;
    public Long subscriberCount;
    public Long viewCount;
    /**
     * Total video count as reported by the YouTube Data API (channel.statistics.videoCount).
     * This is the channel's own count of all its public videos — NOT the number we have stored.
     * Use {@link #indexedVideoCount} to see how many videos SocialLens has indexed in the database.
     */
    public Long videoCount;
    /**
     * Number of videos SocialLens has actually fetched and stored in the database for this channel.
     * May be less than {@link #videoCount} if incremental sync is still in progress.
     * Source: {@code SELECT COUNT(*) FROM youtube_video WHERE channel_id = ?}
     */
    public Long indexedVideoCount;

    public ChannelListItemDto() {}
}
