package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;
import com.LogicGraph.sociallens.dto.channels.EnrichmentHealthDto;
import com.LogicGraph.sociallens.dto.channels.VideoSortKey;
import com.LogicGraph.sociallens.dto.channels.VideosPageResponseDto;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.channel.ChannelVideosService;
import com.LogicGraph.sociallens.service.channel.ChannelsService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/channels")
public class ChannelsController {

    private final ChannelsService channelsService;
    private final ChannelVideosService channelVideosService;
    private final YouTubeChannelRepository channelRepository;
    private final YouTubeVideoRepository videoRepository;

    public ChannelsController(ChannelsService channelsService,
                               ChannelVideosService channelVideosService,
                               YouTubeChannelRepository channelRepository,
                               YouTubeVideoRepository videoRepository) {
        this.channelsService = channelsService;
        this.channelVideosService = channelVideosService;
        this.channelRepository = channelRepository;
        this.videoRepository = videoRepository;
    }

    // -------------------------------------------------------------------------
    // Channel listing / detail
    // -------------------------------------------------------------------------

    /**
     * GET /channels?includeInactive=false
     * Returns all channels sorted by title asc (nulls last).
     */
    @GetMapping
    public List<ChannelListItemDto> listChannels(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return channelsService.listChannels(includeInactive);
    }

    /**
     * GET /channels/{channelDbId}
     * Returns full detail for a single channel; 404 if not found.
     */
    @GetMapping("/{channelDbId}")
    public ChannelDetailDto getChannel(@PathVariable Long channelDbId) {
        return channelsService.getChannelById(channelDbId);
    }

    /**
     * DELETE /channels/{channelDbId}
     * Permanently removes the channel and all dependent rows.
     */
    @DeleteMapping("/{channelDbId}")
    public ResponseEntity<Void> deleteChannel(@PathVariable Long channelDbId) {
        channelsService.deleteChannelById(channelDbId);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // Videos sub-resource
    // -------------------------------------------------------------------------

    /**
     * GET /channels/{channelDbId}/videos
     *
     * <p>Query params:
     * <ul>
     *   <li>{@code q}    – optional title search (blank ignored)</li>
     *   <li>{@code sort} – publishedAt | views | likes | comments | title (default publishedAt)</li>
     *   <li>{@code dir}  – asc | desc (default desc)</li>
     *   <li>{@code page} – zero-based page index (default 0)</li>
     *   <li>{@code size} – page size, clamped to [1, 100] (default 25)</li>
     * </ul>
     */
    @GetMapping("/{channelDbId}/videos")
    public VideosPageResponseDto listVideos(
            @PathVariable Long channelDbId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "publishedAt") String sort,
            @RequestParam(defaultValue = "desc") String dir,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {

        VideoSortKey sortKey = VideoSortKey.fromString(sort);
        if (sortKey == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid sort key '" + sort + "'. Allowed values: " + VideoSortKey.allowedValues());
        }

        Sort.Direction direction;
        if ("asc".equalsIgnoreCase(dir)) {
            direction = Sort.Direction.ASC;
        } else if ("desc".equalsIgnoreCase(dir)) {
            direction = Sort.Direction.DESC;
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid dir '" + dir + "'. Allowed values: asc, desc");
        }

        return channelVideosService.getVideos(channelDbId, q, sortKey, direction, page, size);
    }

    // -------------------------------------------------------------------------
    // Enrichment health   -  GET /channels/{channelDbId}/enrichment-health
    // -------------------------------------------------------------------------

    /**
     * Returns enrichment coverage statistics for a channel's video library.
     *
     * <p>All counts are scoped to <em>active</em> videos only.  Enrichment is inferred from
     * the presence of a non-blank title, which is the primary indicator that the YouTube Data
     * API snippet was successfully fetched for a video.
     *
     * <p>This endpoint is intentionally lightweight — two aggregate COUNT queries — so it can
     * safely be polled on every page load of the video table.
     */
    @GetMapping("/{channelDbId}/enrichment-health")
    public EnrichmentHealthDto enrichmentHealth(@PathVariable Long channelDbId) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Channel not found with id: " + channelDbId));

        long totalVideos = videoRepository.countByChannel_IdAndActiveTrue(channelDbId);
        long missingMetadata = videoRepository.countByChannel_IdAndActiveTrueAndTitleIsNull(channelDbId);

        EnrichmentHealthDto dto = new EnrichmentHealthDto();
        dto.totalVideos = totalVideos;
        dto.enrichedVideos = totalVideos - missingMetadata;
        dto.missingMetadata = missingMetadata;
        dto.lastRefreshAt = channel.getLastSuccessfulRefreshAt();
        dto.lastRefreshStatus = channel.getLastRefreshStatus() != null
                ? channel.getLastRefreshStatus().name() : null;
        dto.lastRefreshError = channel.getLastRefreshError();
        return dto;
    }
}
