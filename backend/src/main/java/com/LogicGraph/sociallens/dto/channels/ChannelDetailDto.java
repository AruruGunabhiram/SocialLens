package com.LogicGraph.sociallens.dto.channels;

import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChannelDetailDto {

    public Long id;
    public String title;
    public String handle;
    public String channelId;
    public boolean active;
    public String description;
    public String thumbnailUrl;
    public String country;
    public Instant publishedAt;
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
    public Long videoCount;

    public ChannelDetailDto() {}
}
