package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;
import com.LogicGraph.sociallens.dto.channels.VideoSortKey;
import com.LogicGraph.sociallens.dto.channels.VideosPageResponseDto;
import com.LogicGraph.sociallens.service.channel.ChannelVideosService;
import com.LogicGraph.sociallens.service.channel.ChannelsService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/channels")
public class ChannelsController {

    private final ChannelsService channelsService;
    private final ChannelVideosService channelVideosService;

    public ChannelsController(ChannelsService channelsService,
                               ChannelVideosService channelVideosService) {
        this.channelsService = channelsService;
        this.channelVideosService = channelVideosService;
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {

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
}
