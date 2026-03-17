package com.LogicGraph.sociallens.entity;

import com.LogicGraph.sociallens.enums.DataSource;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(
    name = "video_metrics_snapshot",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_video_snapshot_day",
        columnNames = {"video_id", "captured_day_utc"}
    )
)
public class VideoMetricsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "video_id", nullable = false)
    private YouTubeVideo video;

    private Long viewCount;
    private Long likeCount;
    private Long commentCount;
    private Long favoriteCount;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "captured_day_utc", nullable = false)
    private LocalDate capturedDayUtc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataSource source;
}
