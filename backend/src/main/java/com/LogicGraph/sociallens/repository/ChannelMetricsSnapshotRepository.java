package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.Instant;
import java.util.Optional;
import java.time.LocalDate;

public interface ChannelMetricsSnapshotRepository
                extends JpaRepository<ChannelMetricsSnapshot, Long> {

        boolean existsByChannel_IdAndCapturedDayUtc(Long channelId, LocalDate dayUtc);

        Optional<ChannelMetricsSnapshot> findFirstByChannel_IdAndCapturedDayUtc(
                        Long channelId, LocalDate capturedDayUtc);

        /**
         * Used for "current totals" (latest snapshot)
         * Example: /analytics/channel
         */
        Optional<ChannelMetricsSnapshot> findTopByChannel_ChannelIdOrderByCapturedAtDesc(String channelId);

        /**
         * Used for time series / trends
         * Example: /analytics/timeseries
         */
        List<ChannelMetricsSnapshot> findByChannel_ChannelIdOrderByCapturedAtAsc(String channelId);

        /**
         * Used for "current totals" (latest snapshot) - by database ID
         * Example: /analytics/channel/by-id
         */
        Optional<ChannelMetricsSnapshot> findTopByChannel_IdOrderByCapturedAtDesc(Long channelDbId);

        /**
         * Used for time series / trends - by database ID (all-time, unfiltered)
         */
        List<ChannelMetricsSnapshot> findByChannel_IdOrderByCapturedAtAsc(Long channelDbId);

        /**
         * Used for date-ranged time series / trends - by database ID.
         * Returns one row per day (unique constraint guarantees this), ordered ascending.
         * Example: /analytics/timeseries/by-id?rangeDays=30
         */
        @Query("SELECT s FROM ChannelMetricsSnapshot s " +
               "WHERE s.channel.id = :channelDbId AND s.capturedDayUtc >= :cutoff " +
               "ORDER BY s.capturedDayUtc ASC")
        List<ChannelMetricsSnapshot> findByChannelIdSince(
                @Param("channelDbId") Long channelDbId,
                @Param("cutoff") LocalDate cutoff);

        Optional<ChannelMetricsSnapshot> findFirstByChannel_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long channelId, Instant startInclusive, Instant endExclusive);

        List<ChannelMetricsSnapshot> findByChannelOrderByCapturedAtDesc(YouTubeChannel channel);

        List<ChannelMetricsSnapshot> findByChannelAndCapturedAtBetween(
                        YouTubeChannel channel, Instant start, Instant end);

        /**
         * Returns the single latest snapshot per channel for a set of channel IDs.
         * Replaces the per-channel N+1 SELECT in ChannelsServiceImpl.listChannels().
         * One query regardless of list size.
         */
        @Query("SELECT s FROM ChannelMetricsSnapshot s " +
               "WHERE s.channel.id IN :channelIds " +
               "  AND s.capturedAt = (" +
               "      SELECT MAX(s2.capturedAt) FROM ChannelMetricsSnapshot s2 " +
               "      WHERE s2.channel.id = s.channel.id)")
        List<ChannelMetricsSnapshot> findLatestPerChannel(@Param("channelIds") List<Long> channelIds);

        /** Total distinct snapshot days for a single channel. */
        long countByChannel_Id(Long channelDbId);

        /**
         * Returns one row per channel: (channelId, snapshotCount).
         * Used to batch-fetch snapshot counts for the channel list without N+1.
         */
        @Query("SELECT s.channel.id AS channelId, COUNT(s) AS snapshotCount " +
               "FROM ChannelMetricsSnapshot s " +
               "WHERE s.channel.id IN :channelIds " +
               "GROUP BY s.channel.id")
        List<SnapshotCountRow> countSnapshotsPerChannel(@Param("channelIds") List<Long> channelIds);

        interface SnapshotCountRow {
                Long getChannelId();
                Long getSnapshotCount();
        }

}
