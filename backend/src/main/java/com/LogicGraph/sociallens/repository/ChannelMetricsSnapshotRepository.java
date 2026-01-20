package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChannelMetricsSnapshotRepository extends JpaRepository<ChannelMetricsSnapshot, Long> {
        Optional<ChannelMetricsSnapshot> findTopByChannel_ChannelIdOrderByCapturedAtDesc(String channelId);
}
