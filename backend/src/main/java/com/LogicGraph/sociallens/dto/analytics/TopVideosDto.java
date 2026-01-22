package com.LogicGraph.sociallens.dto.analytics;

import java.util.List;

public record TopVideosDto(
        String channelId,
        List<TopVideoItemDto> videos) {
    public record TopVideoItemDto(
            String videoId,
            String title,
            long views,
            long likes,
            long comments) {
    }
}
