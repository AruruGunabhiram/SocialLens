package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.exception.RefreshAlreadyRunningException;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DailyRefreshWorker.
 * Note: @Transactional(REQUIRES_NEW) is NOT enforced in this Mockito-only context;
 * we are testing business logic and state changes, not transaction boundaries.
 */
@ExtendWith(MockitoExtension.class)
class DailyRefreshWorkerTest {

    @Mock private YouTubeChannelRepository channelRepo;
    @Mock private YouTubeVideoRepository videoRepo;
    @Mock private YouTubeSyncService syncService;

    private DailyRefreshWorker worker;
    private JobProperties props;

    @BeforeEach
    void setUp() {
        props = new JobProperties(); // defaults: maxVideosPerChannelPerRun = 400
        worker = new DailyRefreshWorker(channelRepo, videoRepo, props, syncService);
    }

    // -------------------------------------------------------------------------

    /**
     * Happy path: all sub-calls succeed, channel ends up with SUCCESS status
     * and lastSuccessfulRefreshAt set.
     */
    @Test
    void refreshOneChannel_successPath_setsStatusSuccess() {
        YouTubeChannel ch = channel(10L, "UCsuccess");
        when(channelRepo.findById(10L)).thenReturn(Optional.of(ch));
        doNothing().when(syncService).refreshChannelMetadata("UCsuccess");
        when(syncService.syncIncrementalVideos(eq("UCsuccess"), any(Instant.class))).thenReturn(3);
        when(syncService.enrichVideoMetadata(10L))
                .thenReturn(new YouTubeSyncService.EnrichmentResult(3, 0, 0));
        when(videoRepo.findByChannel_ChannelId(eq("UCsuccess"), any())).thenReturn(List.of());
        when(channelRepo.save(ch)).thenReturn(ch);

        worker.refreshOneChannel(10L);

        assertThat(ch.getLastRefreshStatus()).isEqualTo(RefreshStatus.SUCCESS);
        assertThat(ch.getLastSuccessfulRefreshAt()).isNotNull();
        assertThat(ch.getLastRefreshError()).isNull();
        verify(channelRepo).save(ch);
    }

    /**
     * When the YouTube API call throws, the channel must be saved with
     * FAILED status and the error message persisted.
     * The exception must also be re-thrown so the job can log and count failures.
     */
    @Test
    void refreshOneChannel_youtubeApiThrows_setsStatusFailed() {
        YouTubeChannel ch = channel(20L, "UCfail");
        when(channelRepo.findById(20L)).thenReturn(Optional.of(ch));
        doThrow(new RuntimeException("YouTube API quota exceeded"))
                .when(syncService).syncIncrementalVideos(eq("UCfail"), any(Instant.class));

        assertThatThrownBy(() -> worker.refreshOneChannel(20L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("YouTube API quota exceeded");

        // Failure status is persisted via syncService.persistChannelRefreshStatus (REQUIRES_NEW),
        // not by mutating `ch` directly and calling channelRepo.save in the catch block.
        verify(syncService).persistChannelRefreshStatus(
                eq(20L),
                eq(RefreshStatus.FAILED),
                argThat(msg -> msg != null && msg.contains("YouTube API quota exceeded")));
    }

    /**
     * Concurrency guard: if the in-memory running map already contains the
     * channel ID, a second call must throw RefreshAlreadyRunningException
     * without touching the repository at all.
     *
     * Simulated by injecting the running map directly via reflection and
     * pre-populating it — no actual concurrency required.
     */
    @Test
    void refreshOneChannel_calledTwiceConcurrently_secondThrowsAlreadyRunning() {
        @SuppressWarnings("unchecked")
        ConcurrentHashMap<Long, Instant> runningMap = new ConcurrentHashMap<>();
        runningMap.put(42L, Instant.now());
        ReflectionTestUtils.setField(worker, "running", runningMap);

        assertThatThrownBy(() -> worker.refreshOneChannel(42L))
                .isInstanceOf(RefreshAlreadyRunningException.class)
                .hasMessageContaining("42");

        // Guard fired before any repo call
        verifyNoInteractions(channelRepo);
    }

    /**
     * JVM-restart recovery lives in ApplicationStartupListener, not in
     * DailyRefreshWorker. This test verifies that ApplicationStartupListener
     * calls resetStaleLocks(IN_PROGRESS → FAILED) on startup.
     */
    @Test
    void refreshOneChannel_onJvmRestart_inProgressChannelsReset() {
        when(channelRepo.resetStaleLocks(
                RefreshStatus.IN_PROGRESS,
                RefreshStatus.FAILED,
                "Reset on startup: JVM restart cleared in-memory lock"))
                .thenReturn(2);

        ApplicationStartupListener listener = new ApplicationStartupListener(channelRepo);
        listener.resetStaleLocks();

        verify(channelRepo).resetStaleLocks(
                RefreshStatus.IN_PROGRESS,
                RefreshStatus.FAILED,
                "Reset on startup: JVM restart cleared in-memory lock");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private YouTubeChannel channel(Long id, String channelId) {
        YouTubeChannel ch = new YouTubeChannel();
        ch.setId(id);
        ch.setChannelId(channelId);
        ch.setTitle("Test Channel " + channelId);
        ch.setLastRefreshStatus(RefreshStatus.NEVER_RUN);
        return ch;
    }
}
