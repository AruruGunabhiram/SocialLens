package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "video_metrics_snapshot", indexes = @Index(name = "idx_video_captured", columnList = "video_id,capturedAt"))
public class VideoMetricsSnapshot {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "video_id")
  private YouTubeVideo video;

  @Column(nullable = false)
  private Instant capturedAt;

  private Long viewCount;
  private Long likeCount;
  private Long commentCount;

  public Long getId() {
    return id;
  }
}
