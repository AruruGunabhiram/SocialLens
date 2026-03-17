package com.LogicGraph.sociallens.service.resolver;

import com.LogicGraph.sociallens.entity.YouTubeChannel;

/**
 * Single entry point for resolving any channel identifier to a canonical YouTubeChannel.
 * No other service does its own channel-identifier parsing.
 */
public interface ChannelResolver {

    /**
     * Pure pattern detection — no API calls, no DB access.
     * Detects identifier type and extracts the canonical value.
     */
    ResolvedChannelIdentifier resolve(String input);

    /**
     * Resolves identifier to a persisted YouTubeChannel entity.
     * Calls the YouTube API if needed, then upserts into the DB.
     */
    YouTubeChannel resolveToChannel(String input);
}
