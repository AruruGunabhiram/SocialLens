package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.channel.ChannelResolver;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
            YouTubeVideoRepository videoRepository,
            VideoMetricsSnapshotRepository videoSnapRepo,
            ChannelMetricsSnapshotRepository channelSnapshotRepository,
            ChannelResolver channelResolver) {
        this.youTubeService = youTubeService;
        this.channelRepository = channelRepository;
        this.videoRepository = videoRepository;
        this.videoSnapRepo = videoSnapRepo;
        this.channelSnapshotRepository = channelSnapshotRepository;
        this.channelResolver = channelResolver;
    }

    // =========================
    // Existing full sync flows
    // =========================

    @Transactional
    public YouTubeSyncResponseDto syncChannelOnly(String identifier) {

        Instant start = Instant.now();

        // 1) Resolve identifier -> (type,value)
        ResolvedChannelIdentifier resolved;
        try {
            resolved = channelResolver.resolve(identifier);
        } catch (Exception e) {
            throw new NotFoundException("Channel not found for identifier: " + identifier);
        }

        // 2) Fetch channel details (one API call)
        ChannelSummaryDto dto = youTubeService.getChannelSummary(resolved);

        // 3) Upsert channel
        YouTubeChannel savedChannel = upsertChannel(dto);

        // 4.3) Pagination: fetch uploads playlist videos page-by-page
        int maxPages = 2;
        int pageSize = 50;

        int pagesFetched = 0;
        int videosFetched = 0;
        int videosSaved = 0;
        int videosUpdated = 0;

        List<String> warnings = new ArrayList<>();

        try {
            String uploadsPlaylistId = youTubeService.getUploadsPlaylistId(dto.channelId);
            String pageToken = null;

            while (pagesFetched < maxPages) {
                YouTubePlaylistItemsResponse page = youTubeService.getUploadsVideoIdsPage(uploadsPlaylistId, pageToken,
                        pageSize);

                pagesFetched++;

                if (page == null || page.items == null || page.items.isEmpty())
                    break;

                for (var item : page.items) {
                    String videoId = null;

                    if (item.contentDetails != null && item.contentDetails.videoId != null) {
                        videoId = item.contentDetails.videoId;
                    } else if (item.snippet != null
                            && item.snippet.resourceId != null
                            && item.snippet.resourceId.videoId != null) {
                        videoId = item.snippet.resourceId.videoId;
                    }

                    if (videoId == null || videoId.isBlank())
                        continue;

                    boolean created = upsertVideo(videoId, savedChannel);
                    if (created)
                        videosSaved++;
                    else
                        videosUpdated++;
                }

                videosFetched += page.items.size();
                pageToken = page.nextPageToken;
                if (pageToken == null || pageToken.isBlank())
                    break;
            }

        } catch (Exception e) {
            warnings.add("Pagination failed: " + e.getMessage());
        }

        Instant finish = Instant.now();
        long durationMs = finish.toEpochMilli() - start.toEpochMilli();

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

    @Transactional
    public void syncChannelByChannelId(String channelId) {
        ChannelSummaryDto dto = youTubeService.getChannelSummaryByChannelId(channelId);
        YouTubeChannel savedChannel = upsertChannel(dto);

    }

    /**
     * This is what jobs should call today.
     * Wire it to the real implementation, not an exception.
     */
    @Transactional
    public void syncChannel(String channelId) {
        syncChannelByChannelId(channelId);
    }

    // =========================
    // Phase 6 additions
    // =========================

    /**
     * Incremental video sync placeholder.
     * For now, just call full sync (safe, slower).
     * Later we implement publishedAfter search + batch fetch.
     */
    @Transactional
    public int syncIncrementalVideos(String channelId, Instant publishedAfter) {
        syncChannelByChannelId(channelId);
        return 0;
    }

    /**
     * Idempotent per-day channel snapshot using capturedAt window [start,end) in
     * UTC.
     */
    @Transactional
public void writeChannelSnapshotIfNeeded(Long channelDbId, LocalDate dayUtc) {
    if (channelSnapshotRepository.existsByChannel_IdAndCapturedDayUtc(channelDbId, dayUtc)) {
        return;
    }

    YouTubeChannel ch = channelRepository.findById(channelDbId)
            .orElseThrow(() -> new IllegalArgumentException("Channel not found id=" + channelDbId));

    ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
    snap.setChannel(ch);
    snap.setCapturedAt(Instant.now());
    snap.setCapturedDayUtc(dayUtc);

    // TODO: persist metrics when you add them to YouTubeChannel or fetch them here

    try {
        channelSnapshotRepository.saveAndFlush(snap);
    } catch (DataIntegrityViolationException ignore) {
        // expected under concurrency if UNIQUE(channel_id, captured_day_utc) exists
    }
}


    /**
     * Idempotent per-day video snapshot using capturedAt window [start,end) in UTC.
     */
    @Transactional
    public void writeVideoSnapshotIfNeeded(Long videoDbId, LocalDate dayUtc) {
        if (videoSnapRepo.existsByVideo_IdAndCapturedDayUtc(videoDbId, dayUtc)) {
            return;
        }

        YouTubeVideo v = videoRepository.findById(videoDbId)
                .orElseThrow(() -> new IllegalArgumentException("Video not found id=" + videoDbId));

        VideoMetricsSnapshot snap = new VideoMetricsSnapshot();
        snap.setVideo(v);
        snap.setCapturedAt(Instant.now());
        snap.setCapturedDayUtc(dayUtc); // YOU NEED THIS FIELD

        // Copy metrics from the video row (when you add them)
        // snap.setViewCount(v.getViewCount());
        // snap.setLikeCount(v.getLikeCount());

        try {
            videoSnapRepo.saveAndFlush(snap);
        } catch (DataIntegrityViolationException ignore) {
            // concurrent creation, expected
        }
    }

    // =========================
    // Helpers
    // =========================

    private YouTubeChannel upsertChannel(ChannelSummaryDto dto) {
        YouTubeChannel channel = channelRepository
                .findByChannelId(dto.channelId)
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId);
        channel.setTitle(dto.title);
        channel.setDescription(dto.description);

        return channelRepository.save(channel);
    }

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
