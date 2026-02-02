package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;
import java.time.Instant;

public interface VideoMetricsSnapshotRepository
                extends JpaRepository<VideoMetricsSnapshot, Long> {
        Optional<VideoMetricsSnapshot> findByVideoIdAndSnapshotDate(Long videoId, LocalDate snapshotDate);

        Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long videoId, Instant startInclusive, Instant endExclusive);
}
