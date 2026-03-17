package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsSummaryDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;

import java.time.Duration;
import java.time.Instant;

public interface AnalyticsService {

    // Original methods using identifier (handle/channelId)
    ChannelAnalyticsDto getChannelAnalytics(String identifier);

    TopVideosDto getTopVideos(String identifier, int limit);

    UploadFrequencyDto getUploadFrequency(String identifier, int weeks);

    TimeSeriesResponseDto getChannelTimeSeries(String identifier, String metric);

    // New methods using database channel ID
    ChannelAnalyticsDto getChannelAnalyticsById(Long channelDbId);

    TopVideosDto getTopVideosById(Long channelDbId, int limit);

    UploadFrequencyDto getUploadFrequencyById(Long channelDbId, int weeks);

    TimeSeriesResponseDto getChannelTimeSeriesById(Long channelDbId, String metric, int rangeDays);

    // DB-driven analytics from snapshots (no YouTube API calls)
    ChannelAnalyticsSummaryDto getChannelSummary(String channelId);

    TimeSeriesDto getTimeSeries(String channelId, String metric, Instant from, Instant to);

    TopVideosDto getTopVideos(String channelId, int limit, Instant from, Instant to);

    double getChannelGrowthRate(String channelId, Duration period);
}
