package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "youtube_channel")
public class YouTubeChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String channelId;

    private String handle;
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Instant publishedAt;

    private String country;
    private String thumbnailUrl;

    public Long getId() { return id; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }
}
