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

    public VideoRowDto() {}
}
