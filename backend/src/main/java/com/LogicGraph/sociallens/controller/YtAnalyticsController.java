package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.analytics.YtAnalyticsSummaryDto;
import com.LogicGraph.sociallens.service.analytics.YtAnalyticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/yt-analytics")
public class YtAnalyticsController {

    private final YtAnalyticsService ytAnalyticsService;

    public YtAnalyticsController(YtAnalyticsService ytAnalyticsService) {
        this.ytAnalyticsService = ytAnalyticsService;
    }

    @GetMapping("/summary")
    public YtAnalyticsSummaryDto summary(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "28") int days
    ) {
        return ytAnalyticsService.fetchSummary(userId, days);
    }
    
}
