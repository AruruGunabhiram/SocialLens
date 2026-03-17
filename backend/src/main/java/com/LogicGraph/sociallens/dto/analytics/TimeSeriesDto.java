package com.LogicGraph.sociallens.dto.analytics;

import com.LogicGraph.sociallens.enums.DataSource;

import java.time.Instant;
import java.util.List;

public record TimeSeriesDto(
        String channelId,
        String metric,
        Instant dataWindowStart,
        Instant dataWindowEnd,
        DataSource source,
        List<TimeSeriesPointDto> points) {
}
