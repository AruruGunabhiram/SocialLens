package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.channel.ChannelResolver;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class YouTubeSyncService {

    private final YouTubeService youTubeService;
    private final YouTubeChannelRepository channelRepository;
    private final YouTubeVideoRepository videoRepository;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepository;
    private final ChannelResolver channelResolver;

    public YouTubeSyncService(
            YouTubeService youTubeService,
            YouTubeChannelRepository channelRepository,
            YouTubeVideoRepository videoRepository,
            ChannelMetricsSnapshotRepository channelSnapshotRepository,
            ChannelResolver channelResolver) {
        this.youTubeService = youTubeService;
        this.channelRepository = channelRepository;
        this.videoRepository = videoRepository;
        this.channelSnapshotRepository = channelSnapshotRepository;
        this.channelResolver = channelResolver;
    }

    @Transactional
    public YouTubeSyncResponseDto syncChannelOnly(String identifier) {

        Instant start = Instant.now();
        System.out.println(">>> SYNC START identifier=" + identifier);

        // 1) Resolve identifier -> (type,value)
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        System.out.println(">>> RESOLVED type=" + resolved.getType() + " value=" + resolved.getValue());

        // 2) Fetch channel details (one API call)
        ChannelSummaryDto dto = youTubeService.getChannelSummary(resolved);
        System.out.println(">>> API OK title=" + dto.title + " channelId=" + dto.channelId);

        // 3) Upsert channel (single helper, no duplicate code)
        YouTubeChannel savedChannel = upsertChannel(dto);
        System.out.println(">>> CHANNEL SAVED id=" + savedChannel.getId());

        // 4) Snapshot (keep it — good for analytics history)
        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setCapturedAt(Instant.now());
        snap.setSubscriberCount(dto.subscribers);
        snap.setViewCount(dto.views);
        snap.setVideoCount(dto.videos);
        snap.setChannel(savedChannel);
        channelSnapshotRepository.save(snap);
        System.out.println(">>> SNAPSHOT SAVED");

        // 4.3) Pagination: fetch uploads playlist videos page-by-page
        int maxPages = 2; // MVP: tune later via request DTO
        int pageSize = 50; // YouTube playlistItems max is 50

        int pagesFetched = 0;
        int videosFetched = 0;
        int videosSaved = 0;
        int videosUpdated = 0;

        List<String> warnings = new ArrayList<>();

        try {
            String uploadsPlaylistId = youTubeService.getUploadsPlaylistId(dto.channelId);
            System.out.println(">>> UPLOADS playlistId=" + uploadsPlaylistId);

            String pageToken = null;

            while (pagesFetched < maxPages) {
                YouTubePlaylistItemsResponse page = youTubeService.getUploadsVideoIdsPage(uploadsPlaylistId, pageToken,
                        pageSize);

                pagesFetched++;

                if (page == null || page.items == null || page.items.isEmpty()) {
                    System.out.println(">>> PLAYLIST page empty, stop");
                    break;
                }

                // For each item: extract videoId and upsert video
                for (var item : page.items) {
                    // IMPORTANT: you must adapt this line to your actual DTO structure
                    // Common path is item.contentDetails.videoId OR item.snippet.resourceId.videoId
                    String videoId = null;

                    if (item.contentDetails != null && item.contentDetails.videoId != null) {
                        videoId = item.contentDetails.videoId;
                    } else if (item.snippet != null
                            && item.snippet.resourceId != null
                            && item.snippet.resourceId.videoId != null) {
                        videoId = item.snippet.resourceId.videoId;
                    }

                    if (videoId == null || videoId.isBlank()) {
                        continue;
                    }

                    boolean created = upsertVideo(videoId, savedChannel);
                    if (created)
                        videosSaved++;
                    else
                        videosUpdated++;
                }

                videosFetched += page.items.size();
                System.out.println(">>> PAGE " + pagesFetched + " fetched, totalVideos=" + videosFetched);

                pageToken = page.nextPageToken;
                if (pageToken == null || pageToken.isBlank()) {
                    System.out.println(">>> No nextPageToken, done");
                    break;
                }
            }
        } catch (Exception e) {
            System.out.println(">>> WARNING: pagination failed: " + e.getMessage());
            warnings.add("Pagination failed: " + e.getMessage());
        }

        Instant finish = Instant.now();
        long durationMs = finish.toEpochMilli() - start.toEpochMilli();

        // 5) Response summary
        YouTubeSyncResponseDto res = new YouTubeSyncResponseDto();
        res.identifier = identifier;

        res.resolved = new YouTubeSyncResponseDto.Resolved();
        res.resolved.channelId = dto.channelId;
        res.resolved.resolvedFrom = resolved.getType().name();
        res.resolved.normalizedInput = resolved.getValue();

        res.result = new YouTubeSyncResponseDto.Result();
        res.result.pagesFetched = pagesFetched;
        res.result.pageSize = pageSize;
        res.result.videosFetched = videosFetched;
        res.result.videosSaved = videosSaved;
        res.result.videosUpdated = videosUpdated;

        res.timing = new YouTubeSyncResponseDto.Timing();
        res.timing.startedAt = start.toString();
        res.timing.finishedAt = finish.toString();
        res.timing.durationMs = durationMs;

        res.warnings = warnings.isEmpty() ? Collections.emptyList() : warnings;

        return res;
    }

    // Keep old method if you still use it for direct channelId testing
    @Transactional
    public void syncChannelByChannelId(String channelId) {
        System.out.println(">>> SYNC START channelId=" + channelId);

        ChannelSummaryDto dto = youTubeService.getChannelSummaryByChannelId(channelId);
        System.out.println(">>> API OK title=" + dto.title);

        YouTubeChannel savedChannel = upsertChannel(dto);
        System.out.println(">>> CHANNEL SAVED id=" + savedChannel.getId());

        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setCapturedAt(Instant.now());
        snap.setSubscriberCount(dto.subscribers);
        snap.setViewCount(dto.views);
        snap.setVideoCount(dto.videos);
        snap.setChannel(savedChannel);

        channelSnapshotRepository.save(snap);
        System.out.println(">>> SNAPSHOT SAVED");
    }

    /**
     * Upsert channel by channelId (natural key)
     */
    private YouTubeChannel upsertChannel(ChannelSummaryDto dto) {
        YouTubeChannel channel = channelRepository
                .findByChannelId(dto.channelId)
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId);
        channel.setTitle(dto.title);
        channel.setDescription(dto.description);

        // Optional: add these only if you have them in dto
        // channel.setThumbnailUrl(dto.thumbnailUrl);
        // channel.setCountry(dto.country);
        // channel.setPublishedAt(dto.publishedAt);

        return channelRepository.save(channel);
    }

    /**
     * Upsert video by videoId (natural key)
     * Returns true if created, false if updated.
     */
    private boolean upsertVideo(String videoId, YouTubeChannel channel) {
        boolean exists = videoRepository.findByVideoId(videoId).isPresent();

        YouTubeVideo video = videoRepository
                .findByVideoId(videoId)
                .orElseGet(YouTubeVideo::new);

        video.setVideoId(videoId);
        video.setChannel(channel);

        videoRepository.save(video);
        return !exists;
    }
}
