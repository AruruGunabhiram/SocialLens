package com.LogicGraph.sociallens.dto.Youtube;

import java.time.Instant;

public class ChannelAnalyticsDto {
    public String channelId;
    public String title;

    public Long totalViews;
    public Long totalLikes;
    public Long totalComments;

    public Long totalVideos;
    public Instant lastSyncedAt;

    public ChannelAnalyticsDto() {
    }

    public ChannelAnalyticsDto(
            String channelId,
            String title,
            Long totalViews,
            Long totalLikes,
            Long totalComments,
            Long totalVideos,
            Instant lastSyncedAt) {
        this.channelId = channelId;
        this.title = title;
        this.totalViews = totalViews;
        this.totalLikes = totalLikes;
        this.totalComments = totalComments;
        this.totalVideos = totalVideos;
        this.lastSyncedAt = lastSyncedAt;
    }
}
