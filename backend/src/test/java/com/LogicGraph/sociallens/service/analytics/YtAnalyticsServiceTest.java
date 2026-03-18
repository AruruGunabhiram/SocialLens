package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.YtAnalyticsSummaryDto;
import com.LogicGraph.sociallens.exception.UpstreamAnalyticsException;
import com.LogicGraph.sociallens.service.oauth.GoogleTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for YtAnalyticsService.
 *
 * RestTemplate is created inline by the service, so we replace it with a mock
 * via ReflectionTestUtils to avoid real HTTP calls.
 */
@ExtendWith(MockitoExtension.class)
class YtAnalyticsServiceTest {

    @Mock private GoogleTokenService googleTokenService;
    @Mock private RestTemplate mockRestTemplate;

    private YtAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new YtAnalyticsService(googleTokenService);
        ReflectionTestUtils.setField(service, "restTemplate", mockRestTemplate);
    }

    // -------------------------------------------------------------------------

    /**
     * Happy path: all five metrics are returned and net subscriber delta is computed.
     */
    @Test
    void fetchSummary_happyPath_populatesDtoAndComputesNetSubscribers() {
        when(googleTokenService.getValidAccessToken(1L)).thenReturn("access-tok");

        // YouTube returns rows as List-of-Lists: [views, minutes, avgDuration, gained, lost]
        List<Object> row = List.of(1_000L, 5_000L, 300L, 50L, 20L);
        Map<String, Object> body = Map.of("rows", List.of(row));
        when(mockRestTemplate.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(body));

        YtAnalyticsSummaryDto dto = service.fetchSummary(1L, 30);

        assertThat(dto.views).isEqualTo(1_000L);
        assertThat(dto.estimatedMinutesWatched).isEqualTo(5_000L);
        assertThat(dto.averageViewDurationSeconds).isEqualTo(300L);
        assertThat(dto.subscribersGained).isEqualTo(50L);
        assertThat(dto.subscribersLost).isEqualTo(20L);
        assertThat(dto.netSubscribers).isEqualTo(30L);   // 50 - 20
    }

    /**
     * If the YouTube API returns an empty rows array the DTO should come back
     * with null metric fields and no exception.
     */
    @Test
    void fetchSummary_emptyRows_returnsEmptyDto() {
        when(googleTokenService.getValidAccessToken(1L)).thenReturn("access-tok");
        when(mockRestTemplate.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("rows", List.of())));

        YtAnalyticsSummaryDto dto = service.fetchSummary(1L, 30);

        assertThat(dto.views).isNull();
        assertThat(dto.netSubscribers).isNull();
    }

    /**
     * Null body from the API (not the same as empty rows) must throw
     * UpstreamAnalyticsException, not a NullPointerException.
     */
    @Test
    void fetchSummary_nullBody_throwsUpstreamAnalyticsException() {
        when(googleTokenService.getValidAccessToken(1L)).thenReturn("access-tok");
        when(mockRestTemplate.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));

        assertThatThrownBy(() -> service.fetchSummary(1L, 30))
                .isInstanceOf(UpstreamAnalyticsException.class)
                .hasMessageContaining("empty body");
    }

    /**
     * HTTP 403 from YouTube Analytics (e.g. insufficient scope) must surface as
     * UpstreamAnalyticsException with status info in the message.
     */
    @Test
    void fetchSummary_httpClientError_throwsUpstreamAnalyticsException() {
        when(googleTokenService.getValidAccessToken(1L)).thenReturn("access-tok");
        when(mockRestTemplate.exchange(anyString(), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.FORBIDDEN, "Forbidden",
                        org.springframework.http.HttpHeaders.EMPTY,
                        "{}".getBytes(StandardCharsets.UTF_8),
                        StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.fetchSummary(1L, 30))
                .isInstanceOf(UpstreamAnalyticsException.class)
                .hasMessageContaining("YouTube Analytics API failed");
    }

    /**
     * Guard clauses for null userId and non-positive days must fire before
     * any network call.
     */
    @Test
    void fetchSummary_invalidArguments_throwIllegalArgumentException() {
        assertThatThrownBy(() -> service.fetchSummary(null, 30))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> service.fetchSummary(1L, 0))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(googleTokenService, mockRestTemplate);
    }
}
