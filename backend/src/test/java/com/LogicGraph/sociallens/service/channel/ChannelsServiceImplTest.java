package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ChannelsServiceImpl.
 *
 * N+1 verification approach: confirm that {@code findLatestPerChannel} is
 * called exactly once with ALL channel IDs (rather than once per channel).
 *
 * Limitation: this is a structural assertion. It proves the code takes the
 * batch path but does NOT measure actual SQL count. For a true query-count
 * test, use a @DataJpaTest with a StatisticsSession or P6Spy. The unit test
 * approach is sufficient for CI gate purposes.
 */
@ExtendWith(MockitoExtension.class)
class ChannelsServiceImplTest {

    @Mock private YouTubeChannelRepository youTubeChannelRepository;
    @Mock private ChannelMetricsSnapshotRepository channelMetricsSnapshotRepository;

    private ChannelsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ChannelsServiceImpl(youTubeChannelRepository,
                channelMetricsSnapshotRepository);
    }

    // -------------------------------------------------------------------------

    /**
     * listChannels must call findLatestPerChannel exactly once for all
     * channel IDs, not once per channel.
     *
     * Given N=3 active channels, findLatestPerChannel must be called with
     * a list of size 3 — not three separate calls.
     */
    @Test
    void listChannels_batchesSnapshotQuery_notNPlusOne() {
        YouTubeChannel ch1 = channel(1L, "UCone",   "Alpha Channel");
        YouTubeChannel ch2 = channel(2L, "UCtwo",   "Beta Channel");
        YouTubeChannel ch3 = channel(3L, "UCthree", "Gamma Channel");

        when(youTubeChannelRepository.findByActiveTrueOrderByTitleAsc())
                .thenReturn(List.of(ch1, ch2, ch3));

        // Batch query returns one snapshot for ch1; ch2 and ch3 have none
        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setChannel(ch1);
        snap.setCapturedAt(Instant.now());
        when(channelMetricsSnapshotRepository.findLatestPerChannel(anyList()))
                .thenReturn(List.of(snap));

        var result = service.listChannels(false);

        assertThat(result).hasSize(3);

        // SINGLE batch call, not N=3 individual calls
        verify(channelMetricsSnapshotRepository, times(1))
                .findLatestPerChannel(argThat(ids -> ids.size() == 3));

        // Verify no per-channel snapshot queries were made
        verify(channelMetricsSnapshotRepository, never())
                .findTopByChannel_IdOrderByCapturedAtDesc(anyLong());
    }

    // -------------------------------------------------------------------------

    private YouTubeChannel channel(Long id, String channelId, String title) {
        YouTubeChannel ch = new YouTubeChannel();
        ch.setId(id);
        ch.setChannelId(channelId);
        ch.setTitle(title);
        ch.setActive(true);
        ch.setLastRefreshStatus(RefreshStatus.NEVER_RUN);
        return ch;
    }
}
