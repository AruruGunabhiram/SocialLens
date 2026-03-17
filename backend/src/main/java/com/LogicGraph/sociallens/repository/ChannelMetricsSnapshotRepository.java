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

}
