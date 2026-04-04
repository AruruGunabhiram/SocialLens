package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.analytics.ChannelAnalyticsDto;
import com.LogicGraph.sociallens.dto.analytics.DailyMetricPointDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;
import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.dto.analytics.UploadFrequencyDto;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.service.analytics.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AnalyticsService analyticsService;

    // ============================================
    // Tests for new /by-id endpoints
    // ============================================

    @Test
    void channelByIdShouldReturnAnalytics() throws Exception {
        // Given: a mock channel analytics response
        ChannelAnalyticsDto mockDto = new ChannelAnalyticsDto(
                "UC_test123",
                "Test Channel",
                100000L,
                5000000L,
                150L,
                null,
                null,
                Collections.emptyList()
        );

        when(analyticsService.getChannelAnalyticsById(123L)).thenReturn(mockDto);

        // When: GET /analytics/channel/by-id?channelDbId=123
        mockMvc.perform(get("/api/v1/analytics/channel/by-id")
                        .param("channelDbId", "123"))
                // Then: should return 200 with channel analytics
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.title").value("Test Channel"))
                .andExpect(jsonPath("$.subscriberCount").value(100000))
                .andExpect(jsonPath("$.totalViews").value(5000000))
                .andExpect(jsonPath("$.videoCount").value(150));
    }

    @Test
    void channelByIdShouldReturn404WhenNotFound() throws Exception {
        // Given: service throws NotFoundException
        when(analyticsService.getChannelAnalyticsById(999L))
                .thenThrow(new NotFoundException("Channel not found with id: 999"));

        // When: GET /analytics/channel/by-id?channelDbId=999
        mockMvc.perform(get("/api/v1/analytics/channel/by-id")
                        .param("channelDbId", "999"))
                // Then: should return 404 with error message
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Channel not found with id: 999"));
    }

    @Test
    void topVideosByIdShouldReturnVideos() throws Exception {
        // Given: a mock top videos response
        TopVideosDto mockDto = new TopVideosDto("UC_test123", Collections.emptyList());

        when(analyticsService.getTopVideosById(123L, 10)).thenReturn(mockDto);

        // When: GET /analytics/videos/by-id?channelDbId=123&limit=10
        mockMvc.perform(get("/api/v1/analytics/videos/by-id")
                        .param("channelDbId", "123")
                        .param("limit", "10"))
                // Then: should return 200 with videos
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.videos").isArray());
    }

    @Test
    void topVideosByIdShouldUseDefaultLimit() throws Exception {
        // Given: a mock response
        TopVideosDto mockDto = new TopVideosDto("UC_test123", Collections.emptyList());

        when(analyticsService.getTopVideosById(eq(123L), anyInt())).thenReturn(mockDto);

        // When: GET /analytics/videos/by-id?channelDbId=123 (no limit param)
        mockMvc.perform(get("/api/v1/analytics/videos/by-id")
                        .param("channelDbId", "123"))
                // Then: should use default limit of 10
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"));
    }

    @Test
    void uploadFrequencyByIdShouldReturnFrequency() throws Exception {
        // Given: a mock upload frequency response
        UploadFrequencyDto mockDto = new UploadFrequencyDto(
                "UC_test123",
                "WEEK",
                Collections.emptyList()
        );

        when(analyticsService.getUploadFrequencyById(123L, 12)).thenReturn(mockDto);

        // When: GET /analytics/upload-frequency/by-id?channelDbId=123&weeks=12
        mockMvc.perform(get("/api/v1/analytics/upload-frequency/by-id")
                        .param("channelDbId", "123")
                        .param("weeks", "12"))
                // Then: should return 200 with frequency data
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.interval").value("WEEK"))
                .andExpect(jsonPath("$.uploads").isArray());
    }

    @Test
    void uploadFrequencyByIdShouldReturn404WhenNotFound() throws Exception {
        // Given: service throws NotFoundException
        when(analyticsService.getUploadFrequencyById(999L, 12))
                .thenThrow(new NotFoundException("Channel not found with id: 999"));

        // When: GET /analytics/upload-frequency/by-id?channelDbId=999
        mockMvc.perform(get("/api/v1/analytics/upload-frequency/by-id")
                        .param("channelDbId", "999")
                        .param("weeks", "12"))
                // Then: should return 404
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Channel not found with id: 999"));
    }

    @Test
    void timeSeriesByIdShouldReturnTimeSeries() throws Exception {
        // Given: a mock time series response with normalized daily points
        List<DailyMetricPointDto> points = List.of(
                new DailyMetricPointDto("2026-02-01", 1000L),
                new DailyMetricPointDto("2026-02-02", 2000L)
        );
        TimeSeriesResponseDto mockDto = new TimeSeriesResponseDto("UC_test123", "VIEWS", points);

        when(analyticsService.getChannelTimeSeriesById(eq(123L), eq("VIEWS"), anyInt()))
                .thenReturn(mockDto);

        // When: GET /analytics/timeseries/by-id?channelDbId=123&metric=VIEWS&rangeDays=30
        mockMvc.perform(get("/api/v1/analytics/timeseries/by-id")
                        .param("channelDbId", "123")
                        .param("metric", "VIEWS")
                        .param("rangeDays", "30"))
                // Then: should return 200 with normalized daily points
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.metric").value("VIEWS"))
                .andExpect(jsonPath("$.points").isArray())
                .andExpect(jsonPath("$.points.length()").value(2))
                .andExpect(jsonPath("$.points[0].date").value("2026-02-01"))
                .andExpect(jsonPath("$.points[0].value").value(1000))
                .andExpect(jsonPath("$.points[1].date").value("2026-02-02"))
                .andExpect(jsonPath("$.points[1].value").value(2000));
    }

    @Test
    void timeSeriesByIdShouldReturn404WhenNotFound() throws Exception {
        // Given: service throws NotFoundException
        when(analyticsService.getChannelTimeSeriesById(eq(999L), eq("VIEWS"), anyInt()))
                .thenThrow(new NotFoundException("Channel not found with id: 999"));

        // When: GET /analytics/timeseries/by-id?channelDbId=999&metric=VIEWS
        mockMvc.perform(get("/api/v1/analytics/timeseries/by-id")
                        .param("channelDbId", "999")
                        .param("metric", "VIEWS"))
                // Then: should return 404
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Channel not found with id: 999"));
    }

    // ============================================
    // New tests for pre-Copilot readiness
    // ============================================

    @Test
    void getChannelAnalytics_withUnknownIdentifier_returns404() throws Exception {
        when(analyticsService.getChannelAnalytics("@no-such-channel"))
                .thenThrow(new NotFoundException("Channel not found: @no-such-channel"));

        mockMvc.perform(get("/api/v1/analytics/channel")
                        .param("identifier", "@no-such-channel"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Channel not found: @no-such-channel"));
    }

    /**
     * Unknown metric strings must be rejected with 400 INVALID_PARAMETER.
     * AnalyticsServiceImpl.extractMetricValue throws IllegalArgumentException for
     * unrecognised names; GlobalExceptionHandler maps that to 400.
     */
    @Test
    void getTimeSeries_withInvalidMetric_returns400() throws Exception {
        when(analyticsService.getChannelTimeSeries(anyString(), eq("INVALID_METRIC")))
                .thenThrow(new IllegalArgumentException(
                        "Unknown metric 'INVALID_METRIC'. Allowed: VIEWS, SUBSCRIBERS, UPLOADS"));

        mockMvc.perform(get("/api/v1/analytics/timeseries")
                        .param("identifier", "@testchannel")
                        .param("metric", "INVALID_METRIC"))
                .andExpect(status().isBadRequest());
    }

    /**
     * rangeDays=0 violates @Min(1). Requires GlobalExceptionHandler to handle
     * HandlerMethodValidationException (Spring 6.1) → 400.
     * The GlobalExceptionHandler has been updated to do this.
     */
    @Test
    void getTimeSeriesById_withNegativeRangeDays_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/timeseries/by-id")
                        .param("channelDbId", "1")
                        .param("metric", "VIEWS")
                        .param("rangeDays", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    /**
     * limit=200 exceeds @Max(100). Same validation path as rangeDays test above.
     */
    @Test
    void getTopVideos_withLimitExceedingMax_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/videos/by-id")
                        .param("channelDbId", "1")
                        .param("limit", "200"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ============================================
    // Test that original endpoints still work
    // ============================================

    @Test
    void originalChannelEndpointShouldStillWork() throws Exception {
        // Given: a mock channel analytics response
        ChannelAnalyticsDto mockDto = new ChannelAnalyticsDto(
                "UC_test123",
                "Test Channel",
                100000L,
                5000000L,
                150L,
                null,
                null,
                Collections.emptyList()
        );

        when(analyticsService.getChannelAnalytics("@testchannel")).thenReturn(mockDto);

        // When: GET /analytics/channel?identifier=@testchannel
        mockMvc.perform(get("/api/v1/analytics/channel")
                        .param("identifier", "@testchannel"))
                // Then: should return 200 with channel analytics
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.title").value("Test Channel"));
    }
}
