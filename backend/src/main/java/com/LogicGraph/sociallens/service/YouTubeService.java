package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.config.YouTubeConfig;
import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeChannelResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.service.channel.ChannelIdentifierType;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.List;

@Service
public class YouTubeService {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Entry point for fetching channel summary.
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

            return toChannelSummaryDto(body,
                    "No channel found for handle: " + handle);

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    /**
     * Fetch channel summary using a channel ID.
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

            return toChannelSummaryDto(body,
                    "No channel found for channelId: " + channelId);

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e
            );
        }
    }

    /**
     * Maps YouTube API response to ChannelSummaryDto.
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
     * SYNC CONTRACT (STUB – Phase 3)
     * This will later:
     * - fetch videos
     * - store in DB
     * - update existing rows
     */
    public YouTubeSyncResponseDto syncChannel(
            ResolvedChannelIdentifier resolved,
            YouTubeSyncRequestDto request
    ) {

        if (resolved == null) {
            throw new IllegalArgumentException("ResolvedChannelIdentifier cannot be null");
        }
        if (request == null || request.identifier == null || request.identifier.isBlank()) {
            throw new IllegalArgumentException("identifier is required");
        }

        long startedAt = System.currentTimeMillis();

        // Ensure channel exists and get canonical channelId
        ChannelSummaryDto channel = getChannelSummary(resolved);

        int maxPages = (request.maxPages == null || request.maxPages < 1)
                ? 1 : request.maxPages;

        int pageSize = (request.pageSize == null || request.pageSize < 1)
                ? 50 : request.pageSize;

        boolean forceRefresh = Boolean.TRUE.equals(request.forceRefresh);

        YouTubeSyncResponseDto response = new YouTubeSyncResponseDto();
        response.identifier = request.identifier;

        // resolved info
        response.resolved = new YouTubeSyncResponseDto.Resolved();
        response.resolved.channelId = channel.channelId;
        response.resolved.resolvedFrom = resolved.getType().name();
        response.resolved.normalizedInput = resolved.getValue();

        // result info (stubbed for now)
        response.result = new YouTubeSyncResponseDto.Result();
        response.result.videosFetched = 0;
        response.result.videosSaved = 0;
        response.result.videosUpdated = 0;
        response.result.pagesFetched = maxPages;
        response.result.pageSize = pageSize;

        // timing
        long finishedAt = System.currentTimeMillis();
        response.timing = new YouTubeSyncResponseDto.Timing();
        response.timing.startedAt = Instant.ofEpochMilli(startedAt).toString();
        response.timing.finishedAt = Instant.ofEpochMilli(finishedAt).toString();
        response.timing.durationMs = finishedAt - startedAt;

        // warnings
        if (forceRefresh) {
            response.warnings = List.of(
                    "forceRefresh=true (DB update behavior will be implemented later)"
            );
        }

        return response;
    }

    /**
     * API key validation.
     */
    private void validateApiKey() {
        if (YouTubeConfig.API_KEY == null || YouTubeConfig.API_KEY.isBlank()) {
            throw new IllegalStateException("Missing YOUTUBE_API_KEY environment variable");
        }
    }

    /**
     * Safe long parsing.
     */
    private long parseLongSafe(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception e) {
            return 0L;
        }
    }
}
