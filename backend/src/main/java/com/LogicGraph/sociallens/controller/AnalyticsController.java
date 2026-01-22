package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;
import com.LogicGraph.sociallens.service.analytics.AnalyticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/channel")
    public ChannelAnalyticsDto channel(@RequestParam String identifier) {
        return analyticsService.getChannelAnalytics(identifier);
    }

    @GetMapping("/videos")
    public TopVideosDto topVideos(
            @RequestParam String identifier,
            @RequestParam(defaultValue = "10") int limit) {
        return analyticsService.getTopVideos(identifier, limit);
    }

    @GetMapping("/upload-frequency")
    public UploadFrequencyDto uploadFrequency(
            @RequestParam String identifier,
            @RequestParam(defaultValue = "12") int weeks) {
        return analyticsService.getUploadFrequency(identifier, weeks);
    }

    @GetMapping("/timeseries")
    public TimeSeriesResponseDto timeSeries(
            @RequestParam String identifier,
            @RequestParam String metric) {
        return analyticsService.getChannelTimeSeries(identifier, metric);
    }
}
