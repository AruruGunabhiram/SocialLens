package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;

@Entity
@Table(
  name = "video_hashtag",
  uniqueConstraints = @UniqueConstraint(
    name = "uq_video_hashtag",
    columnNames = {"video_id", "hashtag_id"}
  )
)
public class VideoHashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "video_id")
    private YouTubeVideo video;

    @ManyToOne(optional = false)
    @JoinColumn(name = "hashtag_id")
    private Hashtag hashtag;

    public Long getId() { return id; }
}
