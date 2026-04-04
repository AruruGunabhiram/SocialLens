package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;
import com.LogicGraph.sociallens.service.channel.ChannelVideosService;
import com.LogicGraph.sociallens.service.channel.ChannelsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ChannelsController.class)
@AutoConfigureMockMvc(addFilters = false)
class ChannelsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ChannelsService channelsService;

    @MockBean
    private ChannelVideosService channelVideosService;

    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/channels?includeInactive=false must call listChannels(false) and
     * return only the active channels the service provides.
     */
    @Test
    void listChannels_includeInactiveFalse_returnsOnlyActive() throws Exception {
        ChannelListItemDto active = new ChannelListItemDto();
        active.id = 1L;
        active.title = "Active Channel";
        active.channelId = "UCactive";
        active.active = true;

        when(channelsService.listChannels(false)).thenReturn(List.of(active));

        mockMvc.perform(get("/api/v1/channels").param("includeInactive", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].channelId").value("UCactive"))
                .andExpect(jsonPath("$[0].active").value(true));
    }

    /**
     * GET /api/v1/channels/{id} when the channel does not exist must return 404.
     * ChannelsServiceImpl throws ResponseStatusException(NOT_FOUND); the new
     * ResponseStatusException handler in GlobalExceptionHandler maps it to 404.
     */
    @Test
    void getChannelById_notFound_returns404() throws Exception {
        when(channelsService.getChannelById(999L))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Channel not found with id: 999"));

        mockMvc.perform(get("/api/v1/channels/999"))
                .andExpect(status().isNotFound());
    }

    /**
     * GET /api/v1/channels/{id}/videos?sort=UNKNOWN must return 400 because
     * VideoSortKey.fromString returns null for an unrecognised key and the
     * controller throws ResponseStatusException(BAD_REQUEST).
     */
    @Test
    void getVideos_withInvalidSortKey_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/channels/1/videos")
                        .param("sort", "UNKNOWN_KEY"))
                .andExpect(status().isBadRequest());
    }
}
