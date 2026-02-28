package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public class TimeSeriesResponseDto {
    /** Database primary key of the channel (stable across renames). */
    public Long channelDbId;
    /** YouTube channel ID string, e.g. "UCxxxxxx". Null for legacy callers. */
    public String channelId;
    public String metric;
    public int rangeDays;
    public List<DailyMetricPointDto> points;

    public TimeSeriesResponseDto() {}

    /** Full constructor used by /timeseries/by-id */
    public TimeSeriesResponseDto(Long channelDbId, String channelId, String metric,
                                 int rangeDays, List<DailyMetricPointDto> points) {
        this.channelDbId = channelDbId;
        this.channelId   = channelId;
        this.metric      = metric;
        this.rangeDays   = rangeDays;
        this.points      = points;
    }

    /** Legacy constructor used by /timeseries (identifier-based) */
    public TimeSeriesResponseDto(String channelId, String metric, List<DailyMetricPointDto> points) {
        this.channelId = channelId;
        this.metric    = metric;
        this.points    = points;
    }
}
