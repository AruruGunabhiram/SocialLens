package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.dto.creator.RetentionPoint;
import com.LogicGraph.sociallens.exception.UpstreamAnalyticsException;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class YouTubeAnalyticsClient {

    private static final String BASE = "https://youtubeanalytics.googleapis.com/v2/reports";
    private final RestTemplate restTemplate = new RestTemplate();

    @SuppressWarnings("unchecked")
    public List<RetentionPoint> fetchAudienceRetentionCurve(
            String accessToken,
            String channelId,
            String videoId,
            LocalDate startDate,
            LocalDate endDate
    ) {
        String url = UriComponentsBuilder.fromHttpUrl(BASE)
                .queryParam("ids", "channel==" + channelId)
                .queryParam("startDate", startDate)
                .queryParam("endDate", endDate)
                .queryParam("dimensions", "elapsedVideoTimeRatio")
                .queryParam("metrics", "audienceWatchRatio,relativeRetentionPerformance")
                .queryParam("filters", "video==" + videoId)
                .queryParam("sort", "elapsedVideoTimeRatio")
                .build()
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class
            );

            Map body = resp.getBody();
            if (body == null || !body.containsKey("rows")) return List.of();

            List<List<Object>> rows = (List<List<Object>>) body.get("rows");
            List<RetentionPoint> out = new ArrayList<>();

            for (List<Object> row : rows) {
                if (row.size() < 2) continue;

                double progress = toDouble(row.get(0));
                double watchRatio = toDouble(row.get(1));

                if (progress < 0 || progress > 1) continue;
                if (watchRatio < 0) continue;

                out.add(new RetentionPoint(progress, watchRatio));
            }

            return out;

        } catch (RestClientResponseException ex) {
            throw new UpstreamAnalyticsException(
                    "YouTube Analytics error: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
        }
    }

    private double toDouble(Object o) {
        if (o == null) return 0.0;
        if (o instanceof Number n) return n.doubleValue();
        return Double.parseDouble(o.toString());
    }
}
