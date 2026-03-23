package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.config.YouTubeConfig;
import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeChannelResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeVideosResponse;
import com.LogicGraph.sociallens.service.resolver.ResolvedChannelIdentifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import com.LogicGraph.sociallens.exception.RateLimitException;
import org.springframework.web.client.HttpServerErrorException;
import com.LogicGraph.sociallens.exception.NotFoundException;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class YouTubeService {

    @Value("${youtube.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    // 1) validation helpers
    private void validateApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Missing YOUTUBE_API_KEY environment variable");
        }
    }

    // 2) ADD THIS METHOD HERE
    private <T> T ytGet(String url, Class<T> clazz) {
        try {
            return restTemplate.getForObject(url, clazz);
        } catch (HttpClientErrorException e) {
            String body = e.getResponseBodyAsString() == null ? "" : e.getResponseBodyAsString();

            if (body.contains("quotaExceeded")
                    || body.contains("rateLimitExceeded")
                    || body.contains("userRateLimitExceeded")) {
                throw new RateLimitException(
                        "YouTube API quota/rate limit exceeded. Try again later.", e);
            }

            throw new RuntimeException(
                    "YouTube API error: " + e.getStatusCode() + " - " + body, e);

        } catch (HttpServerErrorException e) {
            throw new RuntimeException(
                    "YouTube API server error: " + e.getStatusCode(), e);
        }
    }

    // 3) public API methods use ytGet(...)
    public ChannelSummaryDto getChannelSummaryByHandle(String handle) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", "snippet,statistics,contentDetails")
                .queryParam("forHandle", handle)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeChannelResponse body = ytGet(url, YouTubeChannelResponse.class);

        return toChannelSummaryDto(
                body,
                "No channel found for handle: " + handle);
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

        YouTubeChannelResponse body = ytGet(url, YouTubeChannelResponse.class);
        return toChannelSummaryDto(body, "No channel found for channelId: " + channelId);

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

        YouTubeChannelResponse body = ytGet(url, YouTubeChannelResponse.class);

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
            throw new NotFoundException(notFoundMessage);

        }

        var item = body.items.get(0);

        long views = parseLongSafe(item.statistics.viewCount);
        long subscribers = parseLongSafe(item.statistics.subscriberCount);
        long videos = parseLongSafe(item.statistics.videoCount);

        return new ChannelSummaryDto(
                item.id,
                null,
                item.snippet.title,
                item.snippet.description,
                null,
                subscribers,
                views,
                videos,
                null,
                null);
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
        response.resolved.channelId = channel.channelId();
        response.resolved.resolvedFrom = resolved.type().name();
        response.resolved.normalizedInput = resolved.resolvedChannelId();

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
     * Dispatch summary fetch based on resolved identifier type.
     */
    public ChannelSummaryDto getChannelSummary(ResolvedChannelIdentifier resolved) {
        if (resolved == null) {
            throw new IllegalArgumentException("resolved cannot be null");
        }

        return switch (resolved.type()) {
            case HANDLE      -> getChannelSummaryByHandle(resolved.resolvedChannelId());
            case CHANNEL_ID  -> getChannelSummaryByChannelId(resolved.resolvedChannelId());
            case CUSTOM_URL  -> getChannelSummaryByUsername(resolved.resolvedChannelId());
            case VIDEO_URL   -> getChannelSummaryFromVideoId(resolved.resolvedChannelId());
        };
    }

    /**
     * Fetch channel summary using a legacy username (youtube.com/user/ or youtube.com/c/).
     */
    public ChannelSummaryDto getChannelSummaryByUsername(String username) {
        validateApiKey();

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", "snippet,statistics,contentDetails")
                .queryParam("forUsername", username)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeChannelResponse body = ytGet(url, YouTubeChannelResponse.class);
        return toChannelSummaryDto(body, "No channel found for username: " + username);
    }

    /**
     * Resolve a video ID to its owning channel, then return the channel summary.
     */
    public ChannelSummaryDto getChannelSummaryFromVideoId(String videoId) {
        validateApiKey();

        String videoUrl = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/videos")
                .queryParam("part", "snippet")
                .queryParam("id", videoId)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeVideosResponse body = ytGet(videoUrl, YouTubeVideosResponse.class);
        if (body == null || body.items == null || body.items.isEmpty()) {
            throw new NotFoundException("No video found for videoId: " + videoId);
        }

        String channelId = body.items.get(0).snippet != null
                ? body.items.get(0).snippet.channelId
                : null;
        if (channelId == null || channelId.isBlank()) {
            throw new NotFoundException("Video exists but has no channelId: " + videoId);
        }

        return getChannelSummaryByChannelId(channelId);
    }

    /**
     * Fetch one page of uploads playlist items (video IDs + nextPageToken).
     */
    public YouTubePlaylistItemsResponse getUploadsVideoIdsPage(
            String uploadsPlaylistId,
            String pageToken,
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

        ResponseEntity<YouTubePlaylistItemsResponse> resp = ytGetEntity(uri, YouTubePlaylistItemsResponse.class);

        YouTubePlaylistItemsResponse body = resp.getBody();
        if (body == null) {
            throw new RuntimeException("YouTube API returned empty playlistItems response");
        }

        return body;
    }

    /**
     * Centralized YouTube GET (ResponseEntity).
     */
    private <T> ResponseEntity<T> ytGetEntity(URI uri, Class<T> clazz) {
        try {
            return restTemplate.getForEntity(uri, clazz);
        } catch (HttpClientErrorException e) {
            handleClientError(e);
            throw e; // unreachable but keeps compiler happy
        } catch (HttpServerErrorException e) {
            throw new RuntimeException("YouTube API server error: " + e.getStatusCode(), e);
        }
    }

    /**
     * Shared client-side error mapping.
     */
    private void handleClientError(HttpClientErrorException e) {
        String body = e.getResponseBodyAsString() == null ? "" : e.getResponseBodyAsString();

        if (body.contains("quotaExceeded")
                || body.contains("rateLimitExceeded")
                || body.contains("userRateLimitExceeded")) {
            throw new RateLimitException("YouTube API quota/rate limit exceeded. Try again later.", e);
        }

        throw new RuntimeException("YouTube API error: " + e.getStatusCode() + " - " + body, e);
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

    public void refreshChannelMetadata(String channelId) {
        // Call your existing channel fetch logic (Data API)
        // Upsert the YouTubeChannel fields in DB (title, thumbnail, subs, views, etc.)
    }

    /**
     * Fetches video snippet, contentDetails, and statistics from videos.list.
     * Batches at most 50 IDs per request (YouTube API limit).
     *
     * @param videoIds YouTube video IDs to enrich
     * @return list of Item objects with populated snippet/contentDetails/statistics
     */
    public List<YouTubeVideosResponse.Item> fetchVideoDetails(List<String> videoIds) {
        validateApiKey();

        List<YouTubeVideosResponse.Item> result = new ArrayList<>();
        int batchSize = 50;

        for (int i = 0; i < videoIds.size(); i += batchSize) {
            List<String> batch = videoIds.subList(i, Math.min(i + batchSize, videoIds.size()));
            String ids = String.join(",", batch);

            // build(true).toUri() treats the already-assembled string as a fully-encoded URI,
            // so commas in the "id" value are passed through literally.  toUriString() would
            // re-encode them to %2C, which YouTube's videos.list rejects with HTTP 400.
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(YouTubeConfig.BASE_URL + "/videos")
                    .queryParam("part", "snippet,contentDetails,statistics")
                    .queryParam("id", ids)
                    .queryParam("key", apiKey)
                    .build(true)
                    .toUri();

            ResponseEntity<YouTubeVideosResponse> resp = ytGetEntity(uri, YouTubeVideosResponse.class);
            YouTubeVideosResponse body = resp.getBody();
            if (body != null && body.items != null) {
                result.addAll(body.items);
            }
        }

        return result;
    }

}
