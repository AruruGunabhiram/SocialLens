package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

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
         * Used for time series / trends - by database ID
         * Example: /analytics/timeseries/by-id
         */
        List<ChannelMetricsSnapshot> findByChannel_IdOrderByCapturedAtAsc(Long channelDbId);

        Optional<ChannelMetricsSnapshot> findFirstByChannel_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long channelId, Instant startInclusive, Instant endExclusive);

}
