package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.service.YouTubeService;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import com.LogicGraph.sociallens.service.resolver.ChannelResolver;
import com.LogicGraph.sociallens.service.resolver.ResolvedChannelIdentifier;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Handles all YouTube ingestion and channel-lookup endpoints under {@code /api/v1/youtube}.
 *
 * <ul>
 *   <li>{@code POST /sync} — resolves an identifier, syncs the channel and its videos into the DB.</li>
 *   <li>{@code GET /channel/{identifier}} — raw YouTube API lookup by path-variable identifier
 *       (handle, channel ID, or custom URL); does not touch the DB.</li>
 *   <li>{@code GET /channel?q=} — same lookup via query parameter.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/youtube")
public class YouTubeSyncController {

    private final YouTubeSyncService syncService;
    private final YouTubeService youTubeService;
    private final ChannelResolver channelResolver;

    public YouTubeSyncController(YouTubeSyncService syncService,
                                 YouTubeService youTubeService,
                                 ChannelResolver channelResolver) {
        this.syncService = syncService;
        this.youTubeService = youTubeService;
        this.channelResolver = channelResolver;
    }

    /**
     * Syncs a YouTube channel (and its videos) into the database.
     *
     * @param request must contain a non-blank {@code identifier} (handle, channel ID, or URL)
     * @return sync outcome including channelDbId, resolved channel info, and timing
     */
    @PostMapping("/sync")
    public YouTubeSyncResponseDto sync(@Valid @RequestBody YouTubeSyncRequestDto request) {
        return syncService.syncChannelOnly(request.getIdentifier());
    }

    /**
     * Returns a live channel summary directly from the YouTube Data API.
     * Does not persist anything — useful for previewing channel metadata before syncing.
     *
     * @param identifier handle ({@code @mkbhd}), channel ID ({@code UCxxx}), or custom URL slug
     */
    @GetMapping("/channel/{identifier}")
    public ChannelSummaryDto getChannel(@PathVariable String identifier) {
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        return youTubeService.getChannelSummary(resolved);
    }

    /**
     * Same as {@link #getChannel(String)} but accepts the identifier as a query parameter.
     * Convenient when the identifier contains characters that are awkward in a path segment.
     *
     * @param identifier handle, channel ID, or custom URL slug
     */
    @GetMapping("/channel")
    public ChannelSummaryDto getChannelByQuery(@RequestParam("q") String identifier) {
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        return youTubeService.getChannelSummary(resolved);
    }
}
