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
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import java.time.ZoneOffset;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.time.LocalDate;

@Service
public class YouTubeSyncService {

    private final YouTubeService youTubeService;
    private final YouTubeChannelRepository channelRepository;
    private final YouTubeVideoRepository videoRepository; 
    private final VideoMetricsSnapshotRepository videoSnapRepo;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepository;
    private final ChannelResolver channelResolver;

    public YouTubeSyncService(
            YouTubeService youTubeService,
            YouTubeChannelRepository channelRepository,
            VideoMetricsSnapshotRepository videoSnapRepo,
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
        ResolvedChannelIdentifier resolved;
        try {
            resolved = channelResolver.resolve(identifier);
        } catch (Exception e) {
            throw new NotFoundException("Channel not found for identifier: " + identifier);
        }

        // 2) Fetch channel details (one API call)
        ChannelSummaryDto dto;
        try {
            dto = youTubeService.getChannelSummary(resolved);
        } catch (Exception e) {
            // if your YouTubeService already throws NotFoundException, great.
            throw e;
        }

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

    public void syncChannel(String channelId) {
        // TODO: delegate to your existing sync pipeline method
        // Example delegates (pick the one that exists in your codebase):
        // syncChannelByChannelId(channelId);
        // syncChannelData(channelId);
        // runFullSync(channelId);

        throw new UnsupportedOperationException(
                "syncChannel(String) wrapper added for jobs. Wire it to your existing sync method.");
    }

    public int syncIncrementalVideos(String channelId, Instant publishedAfter) {
        // Implement:
        // 1) YouTube search.list with channelId + publishedAfter
        // 2) batch fetch video stats
        // 3) upsert into YouTubeVideoRepository
        // return count updated/inserted
        return 0;
    }


    public void writeChannelSnapshotIfNeeded(String channelId, LocalDate dateUtc) {
        Instant start = dateUtc.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = dateUtc.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        var ch = channelRepo.findByChannelId(channelId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found channelId=" + channelId));

        // You must ensure ch has subscriberCount/viewCount/videoCount somewhere.
        // If not, you need to fetch fresh stats before snapshotting.
        // For now, snapshot whatever is currently stored (null-safe).
        ChannelMetricsSnapshot snap = channelSnapRepo
                .findFirstByChannel_IdAndCapturedAtBetweenOrderByCapturedAtDesc(ch.getId(), start, end)
                .orElseGet(ChannelMetricsSnapshot::new);

        snap.setChannel(ch);

        // Use "now" as capturedAt but keep it within today's window
        snap.setCapturedAt(Instant.now());

        // TODO: Replace these getters with your actual stored fields on YouTubeChannel
        // If YouTubeChannel doesn't store counts, you need to add them OR fetch from
        // API here.
        // Example:
        // snap.setSubscriberCount(ch.getSubscriberCount());
        // snap.setViewCount(ch.getViewCount());
        // snap.setVideoCount(ch.getVideoCount());

        channelSnapRepo.save(snap);
    }

    public void writeVideoSnapshotIfNeeded(Long videoDbId, LocalDate dateUtc) {
        Instant start = dateUtc.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = dateUtc.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        var v = videoRepo.findById(videoDbId)
                .orElseThrow(() -> new IllegalArgumentException("Video not found id=" + videoDbId));

        VideoMetricsSnapshot snap = videoSnapRepo
                .findFirstByVideo_IdAndCapturedAtBetweenOrderByCapturedAtDesc(v.getId(), start, end)
                .orElseGet(VideoMetricsSnapshot::new);

        snap.setVideo(v);
        snap.setCapturedAt(Instant.now());

        // Same issue: YouTubeVideo entity currently doesn't store view/like/comment
        // counts.
        // If you want real values, add fields to YouTubeVideo OR fetch from API here.
        // For now these will remain null unless you fill them.

        videoSnapRepo.save(snap);
    }

}
