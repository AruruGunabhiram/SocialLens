package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public class TimeSeriesResponseDto {
    public String channelId;
    public String metric;
    public List<TimeSeriesPointDto> points;

    public TimeSeriesResponseDto() {
    }

    public TimeSeriesResponseDto(String channelId, String metric, List<TimeSeriesPointDto> points) {
        this.channelId = channelId;
        this.metric = metric;
        this.points = points;
    }
}
