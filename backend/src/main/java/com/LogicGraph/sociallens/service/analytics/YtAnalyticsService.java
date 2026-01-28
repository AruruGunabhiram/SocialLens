package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.YtAnalyticsSummaryDto;
import com.LogicGraph.sociallens.service.oauth.GoogleTokenService;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class YtAnalyticsService {

    private final GoogleTokenService googleTokenService;
    private final RestTemplate restTemplate = new RestTemplate();

    public YtAnalyticsService(GoogleTokenService googleTokenService) {
        this.googleTokenService = googleTokenService;
    }

    public YtAnalyticsSummaryDto fetchSummary(Long userId, int days) {
        if (userId == null) throw new IllegalArgumentException("userId is required");
        if (days <= 0) throw new IllegalArgumentException("days must be > 0");

        String accessToken = googleTokenService.getValidAccessToken(userId);

        LocalDate end = LocalDate.now().minusDays(1);
        LocalDate start = end.minusDays(days);

        String url =
                "https://youtubeanalytics.googleapis.com/v2/reports" +
                "?ids=channel==MINE" +
                "&startDate=" + start +
                "&endDate=" + end +
                "&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<Map> res = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Map body = res.getBody();
            if (body == null) throw new IllegalStateException("YouTube Analytics returned empty body");

            List rows = (List) body.get("rows");

            YtAnalyticsSummaryDto dto = new YtAnalyticsSummaryDto();
            dto.startDate = start.toString();
            dto.endDate = end.toString();

            if (rows == null || rows.isEmpty()) return dto;

            List first = (List) rows.get(0);

            dto.views = toLong(first.get(0));
            dto.estimatedMinutesWatched = toLong(first.get(1));
            dto.averageViewDurationSeconds = toLong(first.get(2));
            dto.subscribersGained = toLong(first.get(3));
            dto.subscribersLost = toLong(first.get(4));

            dto.netSubscribers = (dto.subscribersGained == null || dto.subscribersLost == null)
                    ? null
                    : (dto.subscribersGained - dto.subscribersLost);

            return dto;

        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            throw new IllegalStateException(
                    "YouTube Analytics API failed: " + e.getStatusCode() + " body=" + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        return Long.parseLong(o.toString());
    }
}
