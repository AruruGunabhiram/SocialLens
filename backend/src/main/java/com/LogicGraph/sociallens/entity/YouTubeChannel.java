package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Entity
@Table(name = "youtube_channel")
@Getter
@Setter
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
}
