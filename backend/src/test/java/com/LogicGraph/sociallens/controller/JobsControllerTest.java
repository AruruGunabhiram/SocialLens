package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.exception.RefreshAlreadyRunningException;
import com.LogicGraph.sociallens.jobs.ApiCallBudget;
import com.LogicGraph.sociallens.jobs.DailyRefreshJob;
import com.LogicGraph.sociallens.jobs.DailyRefreshWorker;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(JobsController.class)
@AutoConfigureMockMvc(addFilters = false)
class JobsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DailyRefreshJob dailyRefreshJob;

    @MockBean
    private DailyRefreshWorker dailyRefreshWorker;

        @MockBean
        private ApiCallBudget apiCallBudget;

    // DailyRefreshJob internally uses this; required by WebMvcTest context
    @MockBean
    private YouTubeChannelRepository youTubeChannelRepository;

    // -------------------------------------------------------------------------

    /**
     * POST /api/v1/jobs/refresh/channel?channelDbId=1 when the refresh is
     * already running must return 409 with status=already_running.
     */
    @Test
    void triggerChannelRefresh_whenAlreadyRunning_returns409() throws Exception {
        doThrow(new RefreshAlreadyRunningException(1L))
                .when(dailyRefreshWorker).refreshOneChannel(1L);

        mockMvc.perform(post("/api/v1/jobs/refresh/channel")
                        .param("channelDbId", "1"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value("already_running"))
                .andExpect(jsonPath("$.channelDbId").value(1));
    }

    /**
     * POST /api/v1/jobs/refresh/channel?channelDbId=999 when the channel does
     * not exist must return 404. DailyRefreshWorker throws
     * IllegalArgumentException("Channel not found id=999"), and the updated
     * controller maps that to 404.
     */
    @Test
    void triggerChannelRefresh_whenChannelNotFound_returns404() throws Exception {
        doThrow(new IllegalArgumentException("Channel not found id=999"))
                .when(dailyRefreshWorker).refreshOneChannel(999L);

        mockMvc.perform(post("/api/v1/jobs/refresh/channel")
                        .param("channelDbId", "999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("not_found"))
                .andExpect(jsonPath("$.channelDbId").value(999));
    }

    /**
     * POST /api/v1/jobs/daily-refresh/run must delegate to DailyRefreshJob and
     * return 200 with the trigger message.
     */
    @Test
    void triggerDailyRefresh_runsForAllActiveChannels() throws Exception {
        doNothing().when(dailyRefreshJob).runDailyRefresh();

        mockMvc.perform(post("/api/v1/jobs/daily-refresh/run"))
                .andExpect(status().isOk())
                .andExpect(content().string("Triggered daily refresh"));

        verify(dailyRefreshJob, times(1)).runDailyRefresh();
    }
}
