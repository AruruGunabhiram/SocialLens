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
    /** capturedAt of the most recent ChannelMetricsSnapshot; null if none exists yet. */
    public Instant lastSnapshotAt;
    public Long subscriberCount;
    public Long viewCount;
    public Long videoCount;

    public ChannelListItemDto() {}
}
