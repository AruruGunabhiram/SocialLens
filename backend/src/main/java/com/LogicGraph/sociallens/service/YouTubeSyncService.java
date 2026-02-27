// Changelog: Populate snapshots with metrics, rely on insert-once semantics, sync channel metrics, and enrich video metadata.
package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubePlaylistItemsResponse;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeVideosResponse;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class YouTubeSyncService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeSyncService.class);

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

        // Populate channel metadata from DB entity
        res.channelDbId = savedChannel.getId();
        res.channelId = savedChannel.getChannelId();
        res.title = savedChannel.getTitle();

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
     * Idempotent per-day channel snapshot.
     * Runs in its own transaction (REQUIRES_NEW) so a duplicate-key hit never
     * poisons the caller's transaction. Check-before-insert prevents the constraint
     * violation on normal repeated runs; the catch handles the race-condition case.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeChannelSnapshotIfNeeded(Long channelDbId, LocalDate dayUtc) {
        // Fast path: already have a snapshot for today — nothing to do.
        if (channelSnapshotRepository.existsByChannel_IdAndCapturedDayUtc(channelDbId, dayUtc)) {
            return;
        }

        YouTubeChannel ch = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found id=" + channelDbId));

        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setChannel(ch);
        snap.setCapturedAt(Instant.now());
        snap.setCapturedDayUtc(dayUtc);
        snap.setSubscriberCount(ch.getSubscriberCount());
        snap.setViewCount(ch.getViewCount());
        snap.setVideoCount(ch.getVideoCount());

        try {
            channelSnapshotRepository.saveAndFlush(snap);
        } catch (DataIntegrityViolationException ignore) {
            // Race condition: another thread inserted between our check and insert — fine.
        }
    }


    /**
     * Idempotent per-day video snapshot.
     * Same REQUIRES_NEW + check-before-insert pattern as the channel snapshot.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeVideoSnapshotIfNeeded(Long videoDbId, LocalDate dayUtc) {
        // Fast path: already have a snapshot for today — nothing to do.
        if (videoSnapRepo.existsByVideo_IdAndCapturedDayUtc(videoDbId, dayUtc)) {
            return;
        }

        YouTubeVideo v = videoRepository.findById(videoDbId)
                .orElseThrow(() -> new IllegalArgumentException("Video not found id=" + videoDbId));

        VideoMetricsSnapshot snap = new VideoMetricsSnapshot();
        snap.setVideo(v);
        snap.setCapturedAt(Instant.now());
        snap.setCapturedDayUtc(dayUtc);
        snap.setViewCount(v.getViewCount());
        snap.setLikeCount(v.getLikeCount());
        snap.setCommentCount(v.getCommentCount());

        try {
            videoSnapRepo.saveAndFlush(snap);
        } catch (DataIntegrityViolationException ignore) {
            // Race condition: another thread inserted between our check and insert — fine.
        }
    }

    // =========================
    // Video enrichment
    // =========================

    /**
     * Loads up to 50 stored videoIds for the given channel, calls videos.list
     * (snippet, contentDetails, statistics) in batches, and upserts the metadata
     * back into the existing YOUTUBE_VIDEO rows in a single saveAll transaction.
     *
     * @return number of rows actually updated
     */
    @Transactional
    public int enrichVideoMetadata(Long channelDbId) {
        List<String> videoIds = videoRepository.findVideoIdsByChannelDbId(
                channelDbId, PageRequest.of(0, 50));
        log.info("enrichVideoMetadata: loaded {} videoIds for channelDbId={}", videoIds.size(), channelDbId);

        if (videoIds.isEmpty()) return 0;

        List<YouTubeVideosResponse.Item> items = youTubeService.fetchVideoDetails(videoIds);

        Map<String, YouTubeVideosResponse.Item> detailMap = items.stream()
                .filter(i -> i.id != null)
                .collect(Collectors.toMap(i -> i.id, i -> i, (a, b) -> a));

        List<YouTubeVideo> videos = videoRepository.findAllByVideoIdIn(videoIds);
        List<YouTubeVideo> toSave = new ArrayList<>();

        for (YouTubeVideo video : videos) {
            YouTubeVideosResponse.Item detail = detailMap.get(video.getVideoId());
            if (detail == null) continue;
            applyVideoDetails(video, detail);
            toSave.add(video);
        }

        videoRepository.saveAll(toSave);
        log.info("enrichVideoMetadata: persisted {} updated video rows for channelDbId={}", toSave.size(), channelDbId);
        return toSave.size();
    }

    private void applyVideoDetails(YouTubeVideo video, YouTubeVideosResponse.Item item) {
        if (item.snippet != null) {
            video.setTitle(item.snippet.title);
            video.setDescription(item.snippet.description);
            if (item.snippet.publishedAt != null) {
                try {
                    video.setPublishedAt(Instant.parse(item.snippet.publishedAt));
                } catch (Exception ignored) {
                    // malformed date — leave publishedAt unchanged
                }
            }
            video.setCategoryId(item.snippet.categoryId);
            if (item.snippet.thumbnails != null) {
                String thumbUrl = null;
                if (item.snippet.thumbnails.high != null && item.snippet.thumbnails.high.url != null) {
                    thumbUrl = item.snippet.thumbnails.high.url;
                } else if (item.snippet.thumbnails.medium != null && item.snippet.thumbnails.medium.url != null) {
                    thumbUrl = item.snippet.thumbnails.medium.url;
                } else if (item.snippet.thumbnails.defaultThumb != null) {
                    thumbUrl = item.snippet.thumbnails.defaultThumb.url;
                }
                video.setThumbnailUrl(thumbUrl);
            }
        }
        if (item.contentDetails != null) {
            video.setDuration(item.contentDetails.duration);
        }
        if (item.statistics != null) {
            video.setViewCount(parseLongSafe(item.statistics.viewCount));
            video.setLikeCount(parseLongSafe(item.statistics.likeCount));
            video.setCommentCount(parseLongSafe(item.statistics.commentCount));
        }
    }

    private static Long parseLongSafe(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            return null;
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
        channel.setViewCount(dto.views);
        channel.setSubscriberCount(dto.subscribers);
        channel.setVideoCount(dto.videos);

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
