package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Entity
@Table(name = "youtube_video", indexes = {
        @Index(name = "idx_youtube_video_videoId", columnList = "videoId"),
        @Index(name = "idx_youtube_video_channel_fk", columnList = "youtube_channel_id")
})
@Getter
@Setter
public class YouTubeVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "youtube_channel_id", nullable = false)
    private YouTubeChannel channel;

    @Column(nullable = false, unique = true)
    private String videoId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Instant publishedAt;

    private String duration;
    private String categoryId;
    private String thumbnailUrl;

    public Long getId() {
        return id;
    }

    public String getVideoId() {
        return videoId;
    }

    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }
}
