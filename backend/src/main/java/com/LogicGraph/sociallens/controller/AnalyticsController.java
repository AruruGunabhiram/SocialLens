package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;
import com.LogicGraph.sociallens.service.analytics.AnalyticsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // ============================================
    // Original endpoints using identifier
    // ============================================

    @GetMapping("/channel")
    public ChannelAnalyticsDto channel(@RequestParam String identifier) {
        return analyticsService.getChannelAnalytics(identifier);
    }

    @GetMapping("/videos")
    public TopVideosDto topVideos(
            @RequestParam String identifier,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        return analyticsService.getTopVideos(identifier, limit);
    }

    @GetMapping("/upload-frequency")
    public UploadFrequencyDto uploadFrequency(
            @RequestParam String identifier,
            @RequestParam(defaultValue = "12") @Min(1) @Max(104) int weeks) {
        return analyticsService.getUploadFrequency(identifier, weeks);
    }

    @GetMapping("/timeseries")
    public TimeSeriesResponseDto timeSeries(
            @RequestParam String identifier,
            @RequestParam String metric) {
        return analyticsService.getChannelTimeSeries(identifier, metric);
    }

    // ============================================
    // New endpoints using database channel ID
    // ============================================

    @GetMapping("/channel/by-id")
    public ChannelAnalyticsDto channelById(@RequestParam Long channelDbId) {
        return analyticsService.getChannelAnalyticsById(channelDbId);
    }

    @GetMapping("/videos/by-id")
    public TopVideosDto topVideosById(
            @RequestParam Long channelDbId,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int limit) {
        return analyticsService.getTopVideosById(channelDbId, limit);
    }

    @GetMapping("/upload-frequency/by-id")
    public UploadFrequencyDto uploadFrequencyById(
            @RequestParam Long channelDbId,
            @RequestParam(defaultValue = "12") @Min(1) @Max(104) int weeks) {
        return analyticsService.getUploadFrequencyById(channelDbId, weeks);
    }

    @GetMapping("/timeseries/by-id")
    public TimeSeriesResponseDto timeSeriesById(
            @RequestParam Long channelDbId,
            @RequestParam String metric,
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int rangeDays) {
        return analyticsService.getChannelTimeSeriesById(channelDbId, metric, rangeDays);
    }
}
