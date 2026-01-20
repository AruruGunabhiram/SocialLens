package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public record UploadFrequencyDto(
        String channelId,
        String interval, // e.g. "WEEK"
        List<TimeSeriesPointDto> uploads) {
}
