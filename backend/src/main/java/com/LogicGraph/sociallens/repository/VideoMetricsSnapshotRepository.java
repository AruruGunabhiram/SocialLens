package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

public interface VideoMetricsSnapshotRepository extends JpaRepository<VideoMetricsSnapshot, Long> {

        boolean existsByVideo_IdAndCapturedDayUtc(Long videoId, LocalDate dayUtc);

        Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedDayUtc(
                        Long videoId, LocalDate capturedDayUtc);

        Optional<VideoMetricsSnapshot> findFirstByVideo_IdAndCapturedAtBetweenOrderByCapturedAtDesc(
                        Long videoId, Instant startInclusive, Instant endExclusive);

        List<VideoMetricsSnapshot> findByVideoOrderByCapturedAtDesc(YouTubeVideo video);

        // VideoMetricsSnapshot has no direct channel FK  -  navigate through video.channel
        @Query("SELECT s FROM VideoMetricsSnapshot s WHERE s.video.channel = :channel ORDER BY s.viewCount DESC")
        List<VideoMetricsSnapshot> findTopNByChannelOrderByViewCountDesc(
                        @Param("channel") YouTubeChannel channel, Pageable pageable);
}
