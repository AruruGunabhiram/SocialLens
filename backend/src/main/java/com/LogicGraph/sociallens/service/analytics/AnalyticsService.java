package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;

public interface AnalyticsService {

    ChannelAnalyticsDto getChannelAnalytics(String identifier);

    TopVideosDto getTopVideos(String identifier, int limit);

    UploadFrequencyDto getUploadFrequency(String identifier, int weeks);

    TimeSeriesResponseDto getChannelTimeSeries(String identifier, String metric);
}
