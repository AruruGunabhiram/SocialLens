package com.LogicGraph.sociallens.exception;

import com.LogicGraph.sociallens.controller.AnalyticsController;
import com.LogicGraph.sociallens.service.analytics.AnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalyticsController.class)
@AutoConfigureMockMvc(addFilters = false)
class ApiExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AnalyticsService analyticsService;

    // ==============================================
    // Test 404 Not Found
    // ==============================================

    @Test
    void shouldReturn404WithStructuredError() throws Exception {
        // Given: service throws NotFoundException
        when(analyticsService.getChannelAnalyticsById(anyLong()))
                .thenThrow(new NotFoundException("Channel not found with id: 999"));

        // When: GET request
        mockMvc.perform(get("/analytics/channel/by-id")
                        .param("channelDbId", "999"))
                // Then: should return 404 with structured error
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Channel not found with id: 999"))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.details.path").value("/analytics/channel/by-id"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    // ==============================================
    // Test 400 Bad Request - Missing Parameter
    // ==============================================

    @Test
    void shouldReturn400ForMissingRequiredParameter() throws Exception {
        // When: GET request without required parameter
        mockMvc.perform(get("/analytics/channel/by-id"))
                // Then: should return 400 with clear message
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Missing required parameter: channelDbId"))
                .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"))
                .andExpect(jsonPath("$.details.parameter").value("channelDbId"))
                .andExpect(jsonPath("$.details.expectedType").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    // ==============================================
    // Test 400 Bad Request - Type Mismatch
    // ==============================================

    @Test
    void shouldReturn400ForInvalidParameterType() throws Exception {
        // When: GET request with invalid type (string instead of number)
        mockMvc.perform(get("/analytics/channel/by-id")
                        .param("channelDbId", "not-a-number"))
                // Then: should return 400 with type error
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid parameter type: channelDbId must be a number"))
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER_TYPE"))
                .andExpect(jsonPath("$.details.parameter").value("channelDbId"))
                .andExpect(jsonPath("$.details.providedValue").value("not-a-number"))
                .andExpect(jsonPath("$.details.expectedType").value("Long"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    // ==============================================
    // Test 429 Too Many Requests
    // ==============================================

    @Test
    void shouldReturn429ForRateLimitExceeded() throws Exception {
        // Given: service throws RateLimitException
        when(analyticsService.getChannelAnalytics(anyString()))
                .thenThrow(new RateLimitException("API rate limit exceeded. Please try again later."));

        // When: GET request
        mockMvc.perform(get("/analytics/channel")
                        .param("identifier", "@test"))
                // Then: should return 429 with rate limit error
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("API rate limit exceeded. Please try again later."))
                .andExpect(jsonPath("$.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.details.path").value("/analytics/channel"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
}
