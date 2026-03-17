package com.LogicGraph.sociallens.dto.youtube;

import java.time.Instant;

public record ChannelSummaryDto(
        String channelId,
        String handle,
        String title,
        String description,
        String thumbnailUrl,
        Long subscriberCount,
        Long viewCount,
        Long videoCount,
        Instant lastSyncedAt,
        String syncStatus) {
}
