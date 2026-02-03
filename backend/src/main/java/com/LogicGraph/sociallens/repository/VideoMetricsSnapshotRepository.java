package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.time.LocalDate;

public interface VideoMetricsSnapshotRepository extends JpaRepository<VideoMetricsSnapshot, Long> {

        boolean existsByVideo_IdAndCapturedDayUtc(Long videoId, LocalDate dayUtc);

        Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedDayUtc(
                        Long videoId, LocalDate capturedDayUtc);

        Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long videoId, Instant startInclusive, Instant endExclusive);
}
