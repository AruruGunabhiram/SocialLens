package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public class ChannelAnalyticsDto {

    public String channelId;
    public String title;

    public Long subscribers;
    public Long totalViews;
    public Long totalVideos;

    public List<TimeSeriesPointDto> viewsTrend;
    public List<TimeSeriesPointDto> subscribersTrend;

    public ChannelAnalyticsDto() {
    }

    public ChannelAnalyticsDto(
            String channelId,
            String title,
            Long subscribers,
            Long totalViews,
            Long totalVideos,
            List<TimeSeriesPointDto> viewsTrend,
            List<TimeSeriesPointDto> subscribersTrend) {
        this.channelId = channelId;
        this.title = title;
        this.subscribers = subscribers;
        this.totalViews = totalViews;
        this.totalVideos = totalVideos;
        this.viewsTrend = viewsTrend;
        this.subscribersTrend = subscribersTrend;
    }
}
