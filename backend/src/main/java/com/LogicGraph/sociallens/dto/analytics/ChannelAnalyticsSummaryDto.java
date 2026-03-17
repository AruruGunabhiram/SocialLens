package com.LogicGraph.sociallens.dto.analytics;

import com.LogicGraph.sociallens.enums.DataSource;

import java.time.Instant;

public record ChannelAnalyticsSummaryDto(
        String channelId,
        Instant dataWindowStart,
        Instant dataWindowEnd,
        Instant capturedAt,
        DataSource source,
        Long subscriberCount,
        Long viewCount,
        Long videoCount,
        Double avgViewsPerVideo,
        Double growthRate) {
}
