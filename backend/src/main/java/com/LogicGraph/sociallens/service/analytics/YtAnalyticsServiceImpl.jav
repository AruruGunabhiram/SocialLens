package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.YtAnalyticsSummaryDto;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.GoogleTokenService;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Service
public class YtAnalyticsServiceImpl implements YtAnalyticsService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final GoogleTokenService googleTokenService;
    private final RestTemplate restTemplate = new RestTemplate();

    public YtAnalyticsServiceImpl(
            ConnectedAccountRepository connectedAccountRepository,
            GoogleTokenService googleTokenService
    ) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.googleTokenService = googleTokenService;
    }

    @Override
    public YtAnalyticsSummaryDto getSummary(Long userId, int days) {
        if (days <= 0 || days > 365) days = 28;

        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException("No connected YouTube account for userId=" + userId));

        // 1) refresh if near-expired
        account = googleTokenService.ensureValidAccessToken(account);

        // 2) call API, retry once on 401 with forced refresh
        try {
            return callYouTubeAnalytics(account.getAccessToken(), userId, days);
        } catch (HttpClientErrorException.Unauthorized e) {
            // force refresh and retry once
            account.setExpiresAt(java.time.Instant.EPOCH); // force path
            account = googleTokenService.ensureValidAccessToken(account);
            return callYouTubeAnalytics(account.getAccessToken(), userId, days);
        }
    }

    private YtAnalyticsSummaryDto callYouTubeAnalytics(String accessToken, Long userId, int days) {
        LocalDate end = LocalDate.now(ZoneOffset.UTC);
        LocalDate start = end.minusDays(days - 1L);

        String url = UriComponentsBuilder
                .fromHttpUrl("https://youtubeanalytics.googleapis.com/v2/reports")
                .queryParam("ids", "channel==MINE")
                .queryParam("startDate", start.toString())
                .queryParam("endDate", end.toString())
                .queryParam("metrics", "views,estimatedMinutesWatched,subscribersGained,averageViewDuration")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("YouTube Analytics call failed with status: " + resp.getStatusCode());
        }

        Map body = resp.getBody();

        // Expected: { columnHeaders: [...], rows: [[...]] }
        List<Map> columnHeaders = (List<Map>) body.get("columnHeaders");
        List<List> rows = (List<List>) body.get("rows");

        if (columnHeaders == null || columnHeaders.isEmpty() || rows == null || rows.isEmpty()) {
            // No data (new channel or empty range) -> return zeros instead of blowing up
            YtAnalyticsSummaryDto out = new YtAnalyticsSummaryDto();
            out.userId = userId;
            out.days = days;
            out.startDate = start.toString();
            out.endDate = end.toString();
            out.views = 0L;
            out.estimatedMinutesWatched = 0L;
            out.subscribersGained = 0L;
            out.averageViewDuration = 0.0;
            return out;
        }

        List values = rows.get(0);

        long views = 0, minutes = 0, subs = 0;
        double avgDur = 0.0;

        for (int i = 0; i < columnHeaders.size() && i < values.size(); i++) {
            String name = (String) columnHeaders.get(i).get("name");
            Object v = values.get(i);

            if ("views".equals(name)) views = toLong(v);
            else if ("estimatedMinutesWatched".equals(name)) minutes = toLong(v);
            else if ("subscribersGained".equals(name)) subs = toLong(v);
            else if ("averageViewDuration".equals(name)) avgDur = toDouble(v);
        }

        YtAnalyticsSummaryDto out = new YtAnalyticsSummaryDto();
        out.userId = userId;
        out.days = days;
        out.startDate = start.toString();
        out.endDate = end.toString();
        out.views = views;
        out.estimatedMinutesWatched = minutes;
        out.subscribersGained = subs;
        out.averageViewDuration = avgDur;
        return out;
    }

    private long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        return Long.parseLong(v.toString());
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number n) return n.doubleValue();
        return Double.parseDouble(v.toString());
    }
}
