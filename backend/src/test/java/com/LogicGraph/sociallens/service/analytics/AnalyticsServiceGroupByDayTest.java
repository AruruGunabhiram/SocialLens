package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.DailyMetricPointDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the daily grouping logic inside AnalyticsServiceImpl.
 *
 * groupAndMapToDaily() must:
 * - Produce at most one point per calendar day
 * - Pick the LATEST snapshot when a day has duplicates
 * - Return points sorted ascending by date
 */
@ExtendWith(MockitoExtension.class)
class AnalyticsServiceGroupByDayTest {

    @Mock private YouTubeChannelRepository channelRepository;
    @Mock private YouTubeVideoRepository videoRepository;
    @Mock private ChannelMetricsSnapshotRepository snapshotRepository;
    @Mock private VideoMetricsSnapshotRepository videoSnapshotRepository;

    private AnalyticsServiceImpl service;

    private YouTubeChannel stubChannel;

    @BeforeEach
    void setUp() {
        service = new AnalyticsServiceImpl(
                channelRepository, videoRepository, snapshotRepository, videoSnapshotRepository);

        stubChannel = new YouTubeChannel();
        stubChannel.setId(1L);
        stubChannel.setChannelId("UC_test");
    }

    // -------------------------------------------------------------------------
    // groupAndMapToDaily — direct unit tests (package-private method)
    // -------------------------------------------------------------------------

    @Test
    void singleSnapshotPerDayReturnedAsIs() {
        ChannelMetricsSnapshot s = snapshot(LocalDate.of(2026, 2, 1), "2026-02-01T10:00:00Z", 1000L, null, null);

        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(s), "VIEWS");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).date).isEqualTo("2026-02-01");
        assertThat(result.get(0).value).isEqualTo(1000L);
    }

    @Test
    void duplicateSnapshotsOnSameDayKeepsLatest() {
        LocalDate day = LocalDate.of(2026, 2, 10);
        ChannelMetricsSnapshot early = snapshot(day, "2026-02-10T06:00:00Z", 500L, null, null);
        ChannelMetricsSnapshot late  = snapshot(day, "2026-02-10T22:00:00Z", 999L, null, null);

        // Feed in arbitrary order — grouping must still pick late
        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(late, early), "VIEWS");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).value).isEqualTo(999L);
    }

    @Test
    void multiDaySnapshotsSortedAscending() {
        ChannelMetricsSnapshot d1 = snapshot(LocalDate.of(2026, 2, 1), "2026-02-01T12:00:00Z", 100L, null, null);
        ChannelMetricsSnapshot d2 = snapshot(LocalDate.of(2026, 2, 3), "2026-02-03T12:00:00Z", 300L, null, null);
        ChannelMetricsSnapshot d3 = snapshot(LocalDate.of(2026, 2, 2), "2026-02-02T12:00:00Z", 200L, null, null);

        // Feed unsorted
        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(d1, d3, d2), "VIEWS");

        assertThat(result).hasSize(3);
        assertThat(result.get(0).date).isEqualTo("2026-02-01");
        assertThat(result.get(1).date).isEqualTo("2026-02-02");
        assertThat(result.get(2).date).isEqualTo("2026-02-03");
    }

    @Test
    void subscribersMetricExtracted() {
        ChannelMetricsSnapshot s = snapshotFull(LocalDate.of(2026, 2, 5), "2026-02-05T08:00:00Z",
                1000L, 42L, 7L);

        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(s), "SUBSCRIBERS");

        assertThat(result.get(0).value).isEqualTo(42L);
    }

    @Test
    void uploadsMetricExtracted() {
        ChannelMetricsSnapshot s = snapshotFull(LocalDate.of(2026, 2, 5), "2026-02-05T08:00:00Z",
                1000L, 42L, 7L);

        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(s), "UPLOADS");

        assertThat(result.get(0).value).isEqualTo(7L);
    }

    @Test
    void emptyInputReturnsEmptyList() {
        assertThat(service.groupAndMapToDaily(List.of(), "VIEWS")).isEmpty();
    }

    // -------------------------------------------------------------------------
    // getChannelTimeSeriesById — integration-style (via service public API)
    // -------------------------------------------------------------------------

    @Test
    void timeSeriesByIdReturnsOnePointPerDay() {
        LocalDate day = LocalDate.of(2026, 2, 20);
        ChannelMetricsSnapshot early = snapshot(day, "2026-02-20T04:00:00Z", 100L, null, null);
        ChannelMetricsSnapshot late  = snapshot(day, "2026-02-20T20:00:00Z", 200L, null, null);

        when(channelRepository.findById(1L)).thenReturn(Optional.of(stubChannel));
        when(snapshotRepository.findByChannelIdSince(eq(1L), any(LocalDate.class)))
                .thenReturn(List.of(early, late));

        var result = service.getChannelTimeSeriesById(1L, "VIEWS", 7);

        assertThat(result.points).hasSize(1);
        assertThat(result.points.get(0).value).isEqualTo(200L);
    }

    @Test
    void timeSeriesByIdThrowsWhenChannelNotFound() {
        when(channelRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getChannelTimeSeriesById(999L, "VIEWS", 7))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void timeSeriesByIdResponseContainsChannelDbIdAndRangeDays() {
        when(channelRepository.findById(1L)).thenReturn(Optional.of(stubChannel));
        when(snapshotRepository.findByChannelIdSince(eq(1L), any(LocalDate.class)))
                .thenReturn(List.of());

        var result = service.getChannelTimeSeriesById(1L, "VIEWS", 30);

        assertThat(result.channelDbId).isEqualTo(1L);
        assertThat(result.rangeDays).isEqualTo(30);
        assertThat(result.metric).isEqualTo("VIEWS");
    }

    // -------------------------------------------------------------------------
    // Expand: getChannelTimeSeriesById — range cutoff and empty path
    // -------------------------------------------------------------------------

    /**
     * Snapshots before the cutoff date must be excluded.
     * rangeDays=7 means cutoff = today-6; a snapshot 30 days ago must not appear.
     */
    @Test
    void getChannelTimeSeriesById_rangeExcludesBeforeCutoff() {
        // Repository is mocked to return only in-range snapshots (the real query
        // enforces the cutoff; here we verify the service passes the cutoff correctly).
        // We give the mock one point well within range.
        ChannelMetricsSnapshot inRange = snapshot(
                LocalDate.now().minusDays(2),
                Instant.now().minusSeconds(172800).toString(),
                500L, null, null);

        when(channelRepository.findById(1L)).thenReturn(java.util.Optional.of(stubChannel));
        when(snapshotRepository.findByChannelIdSince(eq(1L), any(LocalDate.class)))
                .thenReturn(List.of(inRange));

        var result = service.getChannelTimeSeriesById(1L, "VIEWS", 7);

        assertThat(result.points).hasSize(1);
        assertThat(result.points.get(0).value).isEqualTo(500L);
        // Verify cutoff is at most rangeDays-1 days ago (checked by date)
        // The service calls findByChannelIdSince(channelDbId, LocalDate.now().minusDays(rangeDays-1))
        // We capture the cutoff argument to assert it's today - 6
        java.time.LocalDate expectedCutoff = java.time.LocalDate.now(java.time.ZoneOffset.UTC).minusDays(6);
        org.mockito.ArgumentCaptor<LocalDate> cutoffCaptor =
                org.mockito.ArgumentCaptor.forClass(LocalDate.class);
        // Verify findByChannelIdSince was called with the correct cutoff
        verify(snapshotRepository).findByChannelIdSince(eq(1L), cutoffCaptor.capture());
        assertThat(cutoffCaptor.getValue()).isEqualTo(expectedCutoff);
    }

    /**
     * When there are no snapshots for the requested range, the response must
     * contain an empty points list (not null).
     */
    @Test
    void getChannelTimeSeriesById_emptySnapshots_returnsEmptyPoints() {
        when(channelRepository.findById(1L)).thenReturn(java.util.Optional.of(stubChannel));
        when(snapshotRepository.findByChannelIdSince(eq(1L), any(LocalDate.class)))
                .thenReturn(List.of());

        var result = service.getChannelTimeSeriesById(1L, "VIEWS", 30);

        assertThat(result.points).isNotNull().isEmpty();
    }

    /**
     * CURRENT BEHAVIOR: unknown metric defaults to VIEWS (no exception thrown).
     * This test documents that behaviour. Once metric validation is added to
     * extractMetricValue, this test should be updated or replaced with a
     * 400-response test.
     */
    @Test
    void getChannelTimeSeries_unknownMetric_defaultsToViews() {
        ChannelMetricsSnapshot s = snapshotFull(LocalDate.of(2026, 3, 1), "2026-03-01T10:00:00Z",
                9999L, 42L, 7L);

        List<DailyMetricPointDto> result = service.groupAndMapToDaily(List.of(s), "UNKNOWN_METRIC");

        // Falls back to viewCount
        assertThat(result).hasSize(1);
        assertThat(result.get(0).value).isEqualTo(9999L);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ChannelMetricsSnapshot snapshot(LocalDate day, String capturedAtIso,
                                             Long views, Long subscribers, Long uploads) {
        ChannelMetricsSnapshot s = new ChannelMetricsSnapshot();
        s.setCapturedDayUtc(day);
        s.setCapturedAt(Instant.parse(capturedAtIso));
        s.setViewCount(views);
        s.setSubscriberCount(subscribers);
        s.setVideoCount(uploads);
        return s;
    }

    private ChannelMetricsSnapshot snapshotFull(LocalDate day, String capturedAtIso,
                                                 Long views, Long subscribers, Long uploads) {
        return snapshot(day, capturedAtIso, views, subscribers, uploads);
    }
}
