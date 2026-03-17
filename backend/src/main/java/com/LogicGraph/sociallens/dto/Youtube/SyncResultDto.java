package com.LogicGraph.sociallens.dto.youtube;

import java.time.Instant;

public record SyncResultDto(
        String channelId,
        int videosProcessed,
        int apiCallsUsed,
        Instant syncedAt,
        String status) {
}
