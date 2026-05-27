package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.dto.youtube.VideoDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeVideosResponse;

import java.util.List;
import java.util.Optional;

/**
 * Raw YouTube Data API v3 wrapper.
 * Every method checks the {@link com.LogicGraph.sociallens.jobs.ApiCallBudget} before calling YouTube.
 * Methods return {@link Optional#empty()} when the resource does not exist  -  never null.
 */
public interface YouTubeService {

    /**
     * Fetches a channel by its canonical YouTube channel ID (UC...).
     *
     * @param channelId the YouTube channel ID
     * @return the channel, or empty if not found
     */
    Optional<ChannelDto> fetchChannelByChannelId(String channelId);

    /**
     * Fetches a channel by its @handle (e.g. {@code @mkbhd}).
     *
     * @param handle the handle, with or without the leading '@'
     * @return the channel, or empty if not found
     */
    Optional<ChannelDto> fetchChannelByHandle(String handle);

    /**
     * Fetches a channel by a legacy custom URL slug (youtube.com/c/slug or youtube.com/user/slug).
     *
     * @param customUrl the custom URL slug (without the base URL)
     * @return the channel, or empty if not found
     */
    Optional<ChannelDto> fetchChannelByCustomUrl(String customUrl);

    /**
     * Fetches the most recent videos uploaded to a channel, up to {@code maxResults}.
     * Internally resolves the channel's uploads playlist and batch-fetches video details.
     *
     * @param channelId  the YouTube channel ID
     * @param maxResults maximum number of videos to return (capped at 50 per YouTube API page limit)
     * @return list of videos, never null
     */
    List<VideoDto> fetchVideosByChannelId(String channelId, int maxResults);

    /**
     * Fetches a single video by its YouTube video ID.
     *
     * @param videoId the YouTube video ID
     * @return the video, or empty if not found
     */
    Optional<VideoDto> fetchVideoById(String videoId);

    /**
     * Resolves a video ID to its owning channel.
     * Makes two API calls: one for the video snippet (to get channelId) and one for the channel.
     *
     * @param videoId YouTube video ID (11-char base64url)
     * @return the owning channel, or empty if the video or its channel cannot be found
     */
    Optional<ChannelDto> fetchChannelByVideoId(String videoId);

    /**
     * Returns the uploads playlist ID for the given channel.
     * Consumes one API call budget unit.
     *
     * @param channelId the YouTube channel ID (UC...)
     * @return the uploads playlist ID
     * @throws RuntimeException if the channel or its uploads playlist is not found
     */
    String resolveUploadsPlaylistId(String channelId);

    /**
     * Fetches one page of playlist items (video IDs + publishedAt + nextPageToken).
     * Requests {@code contentDetails,snippet} so callers can read both videoId and publishedAt
     * for cursor-based incremental sync.
     * Consumes one API call budget unit per call.
     *
     * @param playlistId the uploads playlist ID
     * @param pageToken  continuation token from a previous page, or {@code null} for the first page
     * @param maxResults number of items to return per page (1–50)
     * @return the raw YouTube playlist-items response
     * @throws RuntimeException if the API call fails
     */
    YouTubePlaylistItemsResponse fetchPlaylistPage(String playlistId, String pageToken, int maxResults);

    /**
     * Batch-fetches snippet, contentDetails, and statistics for a list of video IDs.
     * Batches at most 50 IDs per API request; per-batch errors are logged and skipped
     * (other batches still run).
     * Consumes one API call budget unit for entry; individual batch calls are not re-checked.
     *
     * @param videoIds YouTube video IDs to enrich (may be empty)
     * @return list of populated Item objects (may be partial on batch errors)
     */
    List<YouTubeVideosResponse.Item> fetchVideoDetailItems(List<String> videoIds);
}
