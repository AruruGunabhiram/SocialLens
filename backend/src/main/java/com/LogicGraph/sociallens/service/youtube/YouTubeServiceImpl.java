package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.config.YouTubeConfig;
import com.LogicGraph.sociallens.dto.youtube.VideoDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeChannelResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeVideosResponse;
import com.LogicGraph.sociallens.exception.InsufficientApiQuotaException;
import com.LogicGraph.sociallens.exception.RateLimitException;
import com.LogicGraph.sociallens.jobs.ApiCallBudget;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Raw YouTube Data API v3 wrapper.
 * No persistence — all methods fetch live data from YouTube and return mapped internal DTOs.
 */
@Service("youtubeServiceV2")
public class YouTubeServiceImpl implements YouTubeService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeServiceImpl.class);

    private static final String CHANNEL_PARTS = "snippet,statistics,contentDetails";
    private static final int PLAYLIST_MAX_RESULTS = 50;

    @Value("${youtube.api.key}")
    private String apiKey;

    private final ApiCallBudget budget;
    private final RestTemplate restTemplate = new RestTemplate();

    public YouTubeServiceImpl(ApiCallBudget budget) {
        this.budget = budget;
    }

    // -------------------------------------------------------------------------
    // Public interface methods — each consumes exactly one budget unit
    // -------------------------------------------------------------------------

    @Override
    public Optional<ChannelDto> fetchChannelByChannelId(String channelId) {
        checkAndDecrementBudget();
        log.debug("fetchChannelByChannelId channelId={}", channelId);

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", CHANNEL_PARTS)
                .queryParam("id", channelId)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeChannelResponse response = ytGet(url, YouTubeChannelResponse.class);
            log.debug("fetchChannelByChannelId channelId={} items={}", channelId,
                    response != null && response.items != null ? response.items.size() : 0);
            return mapFirstChannel(response);
        } catch (RateLimitException | InsufficientApiQuotaException e) {
            throw e;
        } catch (Exception e) {
            log.error("fetchChannelByChannelId failed channelId={}: {}", channelId, e.getMessage(), e);
            throw toServiceException("fetchChannelByChannelId", channelId, e);
        }
    }

    @Override
    public Optional<ChannelDto> fetchChannelByHandle(String handle) {
        checkAndDecrementBudget();
        log.debug("fetchChannelByHandle handle={}", handle);

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", CHANNEL_PARTS)
                .queryParam("forHandle", handle)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeChannelResponse response = ytGet(url, YouTubeChannelResponse.class);
            log.debug("fetchChannelByHandle handle={} items={}", handle,
                    response != null && response.items != null ? response.items.size() : 0);
            return mapFirstChannel(response);
        } catch (RateLimitException | InsufficientApiQuotaException e) {
            throw e;
        } catch (Exception e) {
            log.error("fetchChannelByHandle failed handle={}: {}", handle, e.getMessage(), e);
            throw toServiceException("fetchChannelByHandle", handle, e);
        }
    }

    @Override
    public Optional<ChannelDto> fetchChannelByCustomUrl(String customUrl) {
        checkAndDecrementBudget();
        log.debug("fetchChannelByCustomUrl customUrl={}", customUrl);

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", CHANNEL_PARTS)
                .queryParam("forUsername", customUrl)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeChannelResponse response = ytGet(url, YouTubeChannelResponse.class);
            log.debug("fetchChannelByCustomUrl customUrl={} items={}", customUrl,
                    response != null && response.items != null ? response.items.size() : 0);
            return mapFirstChannel(response);
        } catch (RateLimitException | InsufficientApiQuotaException e) {
            throw e;
        } catch (Exception e) {
            log.error("fetchChannelByCustomUrl failed customUrl={}: {}", customUrl, e.getMessage(), e);
            throw toServiceException("fetchChannelByCustomUrl", customUrl, e);
        }
    }

    @Override
    public List<VideoDto> fetchVideosByChannelId(String channelId, int maxResults) {
        checkAndDecrementBudget();
        log.debug("fetchVideosByChannelId channelId={} maxResults={}", channelId, maxResults);

        try {
            // Step 1: resolve uploads playlist ID
            String uploadsPlaylistId = resolveUploadsPlaylistId(channelId);
            if (uploadsPlaylistId == null) {
                log.debug("fetchVideosByChannelId channelId={} — no uploads playlist found", channelId);
                return Collections.emptyList();
            }

            // Step 2: fetch video IDs from the playlist (one page, cap at 50)
            int pageSize = Math.min(maxResults, PLAYLIST_MAX_RESULTS);
            List<String> videoIds = fetchVideoIdsFromPlaylist(uploadsPlaylistId, pageSize);
            if (videoIds.isEmpty()) {
                log.debug("fetchVideosByChannelId channelId={} — playlist empty", channelId);
                return Collections.emptyList();
            }

            // Step 3: batch-fetch video details
            List<VideoDto> videos = fetchVideoDetailsBatch(videoIds);
            log.debug("fetchVideosByChannelId channelId={} — returned {} videos", channelId, videos.size());
            return videos;

        } catch (RateLimitException | InsufficientApiQuotaException e) {
            throw e;
        } catch (Exception e) {
            log.error("fetchVideosByChannelId failed channelId={}: {}", channelId, e.getMessage(), e);
            throw toServiceException("fetchVideosByChannelId", channelId, e);
        }
    }

    @Override
    public Optional<VideoDto> fetchVideoById(String videoId) {
        checkAndDecrementBudget();
        log.debug("fetchVideoById videoId={}", videoId);

        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/videos")
                .queryParam("part", "snippet,contentDetails,statistics")
                .queryParam("id", videoId)
                .queryParam("key", apiKey)
                .toUriString();

        try {
            YouTubeVideosResponse response = ytGet(url, YouTubeVideosResponse.class);
            int count = response != null && response.items != null ? response.items.size() : 0;
            log.debug("fetchVideoById videoId={} items={}", videoId, count);

            if (response == null || response.items == null || response.items.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(mapVideo(response.items.get(0)));
        } catch (RateLimitException | InsufficientApiQuotaException e) {
            throw e;
        } catch (Exception e) {
            log.error("fetchVideoById failed videoId={}: {}", videoId, e.getMessage(), e);
            throw toServiceException("fetchVideoById", videoId, e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers — no budget interaction
    // -------------------------------------------------------------------------

    /** Resolves the uploads playlist ID for a given channel ID (no budget charge). */
    private String resolveUploadsPlaylistId(String channelId) {
        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/channels")
                .queryParam("part", "contentDetails")
                .queryParam("id", channelId)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeChannelResponse response = ytGet(url, YouTubeChannelResponse.class);
        if (response == null || response.items == null || response.items.isEmpty()) {
            return null;
        }
        YouTubeChannelResponse.Item item = response.items.get(0);
        if (item.contentDetails == null
                || item.contentDetails.relatedPlaylists == null
                || item.contentDetails.relatedPlaylists.uploads == null) {
            return null;
        }
        return item.contentDetails.relatedPlaylists.uploads;
    }

    /** Fetches up to {@code pageSize} video IDs from the given uploads playlist. */
    private List<String> fetchVideoIdsFromPlaylist(String playlistId, int pageSize) {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://www.googleapis.com/youtube/v3/playlistItems")
                .queryParam("part", "contentDetails")
                .queryParam("playlistId", playlistId)
                .queryParam("maxResults", pageSize)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubePlaylistItemsResponse response = ytGet(url, YouTubePlaylistItemsResponse.class);
        if (response == null || response.items == null) {
            return Collections.emptyList();
        }

        List<String> ids = new ArrayList<>();
        for (YouTubePlaylistItemsResponse.Item item : response.items) {
            if (item.contentDetails != null && item.contentDetails.videoId != null) {
                ids.add(item.contentDetails.videoId);
            }
        }
        return ids;
    }

    /** Batch-fetches video snippet/contentDetails/statistics for a list of video IDs. */
    private List<VideoDto> fetchVideoDetailsBatch(List<String> videoIds) {
        String ids = String.join(",", videoIds);
        String url = UriComponentsBuilder
                .fromHttpUrl(YouTubeConfig.BASE_URL + "/videos")
                .queryParam("part", "snippet,contentDetails,statistics")
                .queryParam("id", ids)
                .queryParam("key", apiKey)
                .toUriString();

        YouTubeVideosResponse response = ytGet(url, YouTubeVideosResponse.class);
        if (response == null || response.items == null) {
            return Collections.emptyList();
        }

        List<VideoDto> result = new ArrayList<>();
        for (YouTubeVideosResponse.Item item : response.items) {
            result.add(mapVideo(item));
        }
        return result;
    }

    /** Maps a YouTube API channel item to the internal {@link ChannelDto}. */
    private Optional<ChannelDto> mapFirstChannel(YouTubeChannelResponse response) {
        if (response == null || response.items == null || response.items.isEmpty()) {
            return Optional.empty();
        }
        YouTubeChannelResponse.Item item = response.items.get(0);
        String uploadsPlaylistId = (item.contentDetails != null
                && item.contentDetails.relatedPlaylists != null)
                ? item.contentDetails.relatedPlaylists.uploads
                : null;

        return Optional.of(new ChannelDto(
                item.id,
                item.snippet != null ? item.snippet.title : null,
                item.snippet != null ? item.snippet.description : null,
                uploadsPlaylistId,
                parseLong(item.statistics != null ? item.statistics.subscriberCount : null),
                parseLong(item.statistics != null ? item.statistics.viewCount : null),
                parseLong(item.statistics != null ? item.statistics.videoCount : null)
        ));
    }

    /** Maps a YouTube API video item to {@link VideoDto}. */
    private VideoDto mapVideo(YouTubeVideosResponse.Item item) {
        String thumbnailUrl = null;
        if (item.snippet != null && item.snippet.thumbnails != null) {
            if (item.snippet.thumbnails.high != null) {
                thumbnailUrl = item.snippet.thumbnails.high.url;
            } else if (item.snippet.thumbnails.medium != null) {
                thumbnailUrl = item.snippet.thumbnails.medium.url;
            } else if (item.snippet.thumbnails.defaultThumb != null) {
                thumbnailUrl = item.snippet.thumbnails.defaultThumb.url;
            }
        }

        Instant publishedAt = null;
        if (item.snippet != null && item.snippet.publishedAt != null) {
            try {
                publishedAt = Instant.parse(item.snippet.publishedAt);
            } catch (Exception ignored) {
                log.debug("Could not parse publishedAt '{}' for video {}", item.snippet.publishedAt, item.id);
            }
        }

        return new VideoDto(
                item.id,
                item.snippet != null ? item.snippet.title : null,
                thumbnailUrl,
                publishedAt,
                parseLong(item.statistics != null ? item.statistics.viewCount : null),
                parseLong(item.statistics != null ? item.statistics.likeCount : null),
                parseLong(item.statistics != null ? item.statistics.commentCount : null),
                item.contentDetails != null ? item.contentDetails.duration : null
        );
    }

    /**
     * Checks budget and decrements. Throws {@link InsufficientApiQuotaException} if exhausted.
     * Must be called at the start of every public method.
     */
    private void checkAndDecrementBudget() {
        if (!budget.decrement()) {
            throw new InsufficientApiQuotaException(1, budget.getRemaining());
        }
    }

    /** Centralized YouTube API GET — translates quota/rate errors into typed exceptions. */
    private <T> T ytGet(String url, Class<T> responseType) {
        try {
            return restTemplate.getForObject(url, responseType);
        } catch (HttpClientErrorException e) {
            String body = e.getResponseBodyAsString() == null ? "" : e.getResponseBodyAsString();
            if (body.contains("quotaExceeded")
                    || body.contains("rateLimitExceeded")
                    || body.contains("userRateLimitExceeded")) {
                throw new RateLimitException("YouTube API quota/rate limit exceeded.", e);
            }
            throw new RuntimeException("YouTube API client error: " + e.getStatusCode() + " — " + body, e);
        } catch (HttpServerErrorException e) {
            throw new RuntimeException("YouTube API server error: " + e.getStatusCode(), e);
        }
    }

    private RuntimeException toServiceException(String method, String identifier, Exception cause) {
        return new RuntimeException(
                "YouTubeService." + method + " failed for identifier=" + identifier + ": " + cause.getMessage(),
                cause);
    }

    private long parseLong(String value) {
        if (value == null || value.isBlank()) return 0L;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
