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
    name = "channel_metrics_snapshot",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_channel_snapshot_day",
        columnNames = {"channel_id", "captured_day_utc"}
    )
)
public class ChannelMetricsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "channel_id", nullable = false)
    private YouTubeChannel channel;

    private Long subscriberCount;
    private Long viewCount;
    private Long videoCount;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "captured_day_utc", nullable = false)
    private LocalDate capturedDayUtc;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataSource source;
}
