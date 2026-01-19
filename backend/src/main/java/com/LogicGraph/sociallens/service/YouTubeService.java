package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.config.YouTubeConfig;
import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeChannelResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.service.channel.ChannelIdentifierType;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.List;

@Service
public class YouTubeService {

    @Value("${youtube.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * API key validation (single source of truth).
     */
    private void validateApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Missing YOUTUBE_API_KEY environment variable");
        }
    }

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
                .queryParam("part", "snippet,statistics,contentDetails")
                .queryParam("forHandle", handle)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeChannelResponse body = restTemplate.getForObject(url, YouTubeChannelResponse.class);

            return toChannelSummaryDto(body,
                    "No channel found for handle: " + handle);

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e);
        }
    }

    /**
     * Fetch channel summary using a channel ID.
     */
    public ChannelSummaryDto getChannelSummaryByChannelId(String channelId) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", "snippet,statistics,contentDetails")
                .queryParam("id", channelId)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeChannelResponse body = restTemplate.getForObject(url, YouTubeChannelResponse.class);

            return toChannelSummaryDto(body,
                    "No channel found for channelId: " + channelId);

        } catch (HttpClientErrorException e) {
            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    e);
        }
    }

    // So pagination logic stays clean and readable.

    public String getUploadsPlaylistId(String channelId) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", YouTubeConfig.CHANNEL_PARTS) // must include contentDetails
                .queryParam("id", channelId)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeChannelResponse body = restTemplate.getForObject(url, YouTubeChannelResponse.class);

        if (body == null || body.items == null || body.items.isEmpty()) {
            throw new RuntimeException("No channel found for channelId: " + channelId);
        }

        var item = body.items.get(0);

        if (item.contentDetails == null ||
                item.contentDetails.relatedPlaylists == null ||
                item.contentDetails.relatedPlaylists.uploads == null ||
                item.contentDetails.relatedPlaylists.uploads.isBlank()) {
            throw new RuntimeException("Uploads playlistId not found for channelId: " + channelId);
        }

        return item.contentDetails.relatedPlaylists.uploads;
    }

    /**
     * Maps YouTube API response to ChannelSummaryDto.
     */
    private ChannelSummaryDto toChannelSummaryDto(
            YouTubeChannelResponse body,
            String notFoundMessage) {
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
                videos);
    }

    /**
     * SYNC CONTRACT (STUB – currently only returns summary)
     */
    public YouTubeSyncResponseDto syncChannel(
            ResolvedChannelIdentifier resolved,
            YouTubeSyncRequestDto request) {

        if (resolved == null) {
            throw new IllegalArgumentException("ResolvedChannelIdentifier cannot be null");
        }
        if (request == null || request.getIdentifier() == null || request.getIdentifier().isBlank()) {
            throw new IllegalArgumentException("identifier is required");
        }

        long startedAt = System.currentTimeMillis();

        // Ensure channel exists and get canonical channelId
        ChannelSummaryDto channel = getChannelSummary(resolved);

        int maxPages = (request.getMaxPages() == null || request.getMaxPages() < 1)
                ? 1
                : request.getMaxPages();

        int pageSize = (request.getPageSize() == null || request.getPageSize() < 1)
                ? 50
                : request.getPageSize();

        boolean forceRefresh = Boolean.TRUE.equals(request.getForceRefresh());

        YouTubeSyncResponseDto response = new YouTubeSyncResponseDto();
        response.identifier = request.getIdentifier();

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
                    "forceRefresh=true (DB update behavior will be implemented later)");
        }

        return response;
    }

    /**
     * Fetch one page of uploads playlist items (video IDs + nextPageToken).
     */
    public YouTubePlaylistItemsResponse getUploadsVideoIdsPage(String uploadsPlaylistId, String pageToken,
            int maxResults) {
        validateApiKey();

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl("https://www.googleapis.com/youtube/v3/playlistItems")
                .queryParam("part", "contentDetails,snippet")
                .queryParam("playlistId", uploadsPlaylistId)
                .queryParam("maxResults", maxResults)
                .queryParam("key", apiKey);

        if (pageToken != null && !pageToken.isBlank()) {
            builder.queryParam("pageToken", pageToken);
        }

        URI uri = builder.build(true).toUri();

        ResponseEntity<YouTubePlaylistItemsResponse> resp = restTemplate.getForEntity(uri,
                YouTubePlaylistItemsResponse.class);

        YouTubePlaylistItemsResponse body = resp.getBody();
        if (body == null) {
            throw new RuntimeException("YouTube API returned empty playlistItems response");
        }
        return body;
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
