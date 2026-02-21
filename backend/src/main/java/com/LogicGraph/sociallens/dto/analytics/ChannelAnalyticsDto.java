package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public class ChannelAnalyticsDto {

    public String channelId;
    public String title;

    public Long subscriberCount;
    public Long totalViews;
    public Long videoCount;
    public Long likeCount;
    public Long commentCount;

    public List<TimeSeriesPointDto> timeseries;

    public ChannelAnalyticsDto() {
    }

    public ChannelAnalyticsDto(
            String channelId,
            String title,
            Long subscriberCount,
            Long totalViews,
            Long videoCount,
            Long likeCount,
            Long commentCount,
            List<TimeSeriesPointDto> timeseries) {
        this.channelId = channelId;
        this.title = title;
        this.subscriberCount = subscriberCount;
        this.totalViews = totalViews;
        this.videoCount = videoCount;
        this.likeCount = likeCount;
        this.commentCount = commentCount;
        this.timeseries = timeseries;
    }
}
