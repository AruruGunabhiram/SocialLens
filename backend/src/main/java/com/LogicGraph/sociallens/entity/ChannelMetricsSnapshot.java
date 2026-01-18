package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(
  name = "channel_metrics_snapshot",
  indexes = @Index(name = "idx_channel_captured", columnList = "channel_id,capturedAt")
)
@Getter
@Setter
public class ChannelMetricsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "channel_id")
    private YouTubeChannel channel;

    @Column(nullable = false)
    private Instant capturedAt;

    private Long subscriberCount;
    private Long viewCount;
    private Long videoCount;
}
