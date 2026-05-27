package com.LogicGraph.sociallens.dto.youtube;

import java.time.Instant;

public record VideoDto(
        String videoId,
        String title,
        String thumbnailUrl,
        Instant publishedAt,
        Long viewCount,
        Long likeCount,
        Long commentCount,
        String duration) {
}
