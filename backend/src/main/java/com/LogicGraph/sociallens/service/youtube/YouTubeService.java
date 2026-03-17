package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.dto.youtube.VideoDto;

import java.util.List;
import java.util.Optional;

/**
 * Raw YouTube Data API v3 wrapper.
 * Every method checks the {@link com.LogicGraph.sociallens.jobs.ApiCallBudget} before calling YouTube.
 * Methods return {@link Optional#empty()} when the resource does not exist — never null.
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
}
