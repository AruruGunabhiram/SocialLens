package com.LogicGraph.sociallens.dto.analytics;

import java.time.Instant;

public class TimeSeriesPointDto {
    public Instant timestamp;
    public Long value;

    public TimeSeriesPointDto() {
    }

    public TimeSeriesPointDto(Instant timestamp, Long value) {
        this.timestamp = timestamp;
        this.value = value;
    }
}
