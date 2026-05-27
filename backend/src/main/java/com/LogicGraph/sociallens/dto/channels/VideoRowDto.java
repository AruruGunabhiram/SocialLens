package com.LogicGraph.sociallens.dto.channels;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class VideoRowDto {

    public Long id;
    public String videoId;
    public String title;
    public Instant publishedAt;
    public String thumbnailUrl;
    public Long viewCount;
    public Long likeCount;
    public Long commentCount;
    /**
     * {@code true} when the video has been enriched with full metadata (title, thumbnail, counts)
     * from the YouTube Data API.  {@code false} means discovery occurred but enrichment has not
     * run yet (or failed).  Derived from {@code title != null} since title is the primary
     * indicator of a successful enrichment pass — no separate DB column is needed.
     */
    public boolean enriched;

    public VideoRowDto() {}
}
