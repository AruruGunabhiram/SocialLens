package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface VideoMetricsSnapshotRepository extends JpaRepository<VideoMetricsSnapshot, Long> {

    Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
            Long videoId, Instant startInclusive, Instant endExclusive
    );
}
