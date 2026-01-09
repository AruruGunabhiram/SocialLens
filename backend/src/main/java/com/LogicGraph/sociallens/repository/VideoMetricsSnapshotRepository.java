package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoMetricsSnapshotRepository
        extends JpaRepository<VideoMetricsSnapshot, Long> {
}
