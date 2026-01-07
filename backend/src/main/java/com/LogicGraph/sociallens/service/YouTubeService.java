package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.config.YouTubeConfig;
import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeChannelResponse;
import com.LogicGraph.sociallens.service.channel.ChannelIdentifierType;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class YouTubeService {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Single entry point for fetching channel summary.
     * Accepts a resolved identifier and delegates to the correct API call.
     */
    public ChannelSummaryDto getChannelSummary(ResolvedChannelIdentifier resolved) {
        if (resolved == null) {
            throw new IllegalArgumentException("ResolvedChannelIdentifier cannot be null");
        }

        if (resolved.getType() == ChannelIdentifierType.CHANNEL_ID) {
            return getChannelSummaryByChannelId(resolved.getValue());
        }

        // HANDLE / HANDLE_URL / RAW_HANDLE
        return getChannelSummaryByHandle(resolved.getValue());
    }

    /**
     * Fetch channel summary using a YouTube handle.
     * Uses: channels.list?forHandle=...
     */
    public ChannelSummaryDto getChannelSummaryByHandle(String handle) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", YouTubeConfig.CHANNEL_PARTS)
                .queryParam("forHandle", handle)
                .queryParam("key", YouTubeConfig.API_KEY)
                .toUriString();

        try {
            YouTubeChannelResponse body =
                    restTemplate.getForObject(url, YouTubeChannelResponse.class);

            return toChannelSummaryDto(
                    body,
                    "No channel found for handle: " + handle
            );

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    /**
     * Fetch channel summary using a channel ID.
     * Uses: channels.list?id=...
     */
    public ChannelSummaryDto getChannelSummaryByChannelId(String channelId) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", YouTubeConfig.CHANNEL_PARTS)
                .queryParam("id", channelId)
                .queryParam("key", YouTubeConfig.API_KEY)
                .toUriString();

        try {
            YouTubeChannelResponse body =
                    restTemplate.getForObject(url, YouTubeChannelResponse.class);

            return toChannelSummaryDto(
                    body,
                    "No channel found for channelId: " + channelId
            );

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    /**
     * Maps YouTube API response to ChannelSummaryDto.
     * Shared by handle and channelId lookups.
     */
    private ChannelSummaryDto toChannelSummaryDto(
            YouTubeChannelResponse body,
            String notFoundMessage
    ) {
        if (body == null || body.items == null || body.items.isEmpty()) {
            throw new RuntimeException(notFoundMessage);
        }

        var item = body.items.get(0);

        long views = parseLongSafe(item.statistics.viewCount);
        long subscribers = parseLongSafe(item.statistics.subscriberCount);
        long videos = parseLongSafe(item.statistics.videoCount);

        return new ChannelSummaryDto(
                item.id,
                item.snippet.title,
                item.snippet.description,
                views,
                subscribers,
                videos
        );
    }

    /**
     * Validates presence of API key.
     */
    private void validateApiKey() {
        if (YouTubeConfig.API_KEY == null || YouTubeConfig.API_KEY.isBlank()) {
            throw new IllegalStateException("Missing YOUTUBE_API_KEY environment variable");
        }
    }

    /**
     * Safe long parsing from API response.
     */
    private long parseLongSafe(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception e) {
            return 0L;
        }
    }
}
