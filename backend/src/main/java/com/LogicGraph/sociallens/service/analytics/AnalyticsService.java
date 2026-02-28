package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;

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
}
