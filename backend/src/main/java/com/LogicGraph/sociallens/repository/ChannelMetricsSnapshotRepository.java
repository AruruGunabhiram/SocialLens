package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.time.Instant;
import java.util.Optional;

public interface ChannelMetricsSnapshotRepository
                extends JpaRepository<ChannelMetricsSnapshot, Long> {

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

        Optional<ChannelMetricsSnapshot> findByChannelIdAndSnapshotDate(Long channelId, LocalDate snapshotDate);

        Optional<ChannelMetricsSnapshot> findFirstByChannel_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long channelId, Instant startInclusive, Instant endExclusive);

}
