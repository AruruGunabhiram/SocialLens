package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(YouTubeSyncController.class)
@AutoConfigureMockMvc(addFilters = false)
class YouTubeSyncControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private YouTubeSyncService syncService;

    @Test
    void syncShouldReturnChannelDbIdAndMetadata() throws Exception {
        // Given: a mock response with channel DB metadata
        YouTubeSyncResponseDto mockResponse = new YouTubeSyncResponseDto();
        mockResponse.identifier = "@testchannel";
        mockResponse.channelDbId = 123L;
        mockResponse.channelId = "UC_test123";
        mockResponse.title = "Test Channel Title";

        mockResponse.resolved = new YouTubeSyncResponseDto.Resolved();
        mockResponse.resolved.channelId = "UC_test123";
        mockResponse.resolved.resolvedFrom = "HANDLE";
        mockResponse.resolved.normalizedInput = "@testchannel";

        mockResponse.result = new YouTubeSyncResponseDto.Result();
        mockResponse.result.videosFetched = 10;
        mockResponse.result.videosSaved = 8;
        mockResponse.result.videosUpdated = 2;
        mockResponse.result.pagesFetched = 1;
        mockResponse.result.pageSize = 50;

        mockResponse.timing = new YouTubeSyncResponseDto.Timing();
        mockResponse.timing.startedAt = "2024-01-01T00:00:00Z";
        mockResponse.timing.finishedAt = "2024-01-01T00:00:10Z";
        mockResponse.timing.durationMs = 10000L;

        when(syncService.syncChannelOnly(anyString())).thenReturn(mockResponse);

        // When: POST /api/v1/youtube/sync
        mockMvc.perform(post("/api/v1/youtube/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"@testchannel\"}"))
                // Then: response should contain channelDbId, channelId, and title
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelDbId").value(123))
                .andExpect(jsonPath("$.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.title").value("Test Channel Title"))
                // And: original fields should still be present
                .andExpect(jsonPath("$.identifier").value("@testchannel"))
                .andExpect(jsonPath("$.resolved.channelId").value("UC_test123"))
                .andExpect(jsonPath("$.result.videosFetched").value(10));
    }

    @Test
    void syncResponseShouldIncludeNonNullChannelDbId() throws Exception {
        // Given: a minimal mock response with required channel metadata
        YouTubeSyncResponseDto mockResponse = new YouTubeSyncResponseDto();
        mockResponse.identifier = "@anotherchannel";
        mockResponse.channelDbId = 456L;  // This must be non-null
        mockResponse.channelId = "UC_another456";
        mockResponse.title = "Another Channel";

        mockResponse.resolved = new YouTubeSyncResponseDto.Resolved();
        mockResponse.resolved.channelId = "UC_another456";
        mockResponse.resolved.resolvedFrom = "HANDLE";
        mockResponse.resolved.normalizedInput = "@anotherchannel";

        mockResponse.result = new YouTubeSyncResponseDto.Result();
        mockResponse.timing = new YouTubeSyncResponseDto.Timing();

        when(syncService.syncChannelOnly(anyString())).thenReturn(mockResponse);

        // When: POST /api/v1/youtube/sync
        mockMvc.perform(post("/api/v1/youtube/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"@anotherchannel\"}"))
                // Then: channelDbId must be present and non-null
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channelDbId").exists())
                .andExpect(jsonPath("$.channelDbId").isNotEmpty())
                .andExpect(jsonPath("$.channelDbId").value(456));
    }
}
