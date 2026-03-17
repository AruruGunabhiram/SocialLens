package com.LogicGraph.sociallens.service.youtube;

/**
 * Internal service-layer representation of a YouTube channel.
 * Maps raw YouTube Data API v3 fields to domain model fields.
 * Not exposed to controllers — use {@code ChannelSummaryDto} for API responses.
 */
public record ChannelDto(
        String channelId,
        String title,
        String description,
        String uploadsPlaylistId,
        Long subscriberCount,
        Long viewCount,
        Long videoCount
) {}
