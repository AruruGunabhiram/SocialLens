package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "youtube_video")
public class YouTubeVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "channel_id")
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

    public Long getId() { return id; }
    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }
}
