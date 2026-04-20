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
import com.LogicGraph.sociallens.enums.DataSource;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.resolver.ChannelResolver;
import com.LogicGraph.sociallens.service.resolver.ResolvedChannelIdentifier;
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
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class YouTubeSyncService {

    /**
     * Counts from a single {@link #enrichVideoMetadata} run.
     *
     * @param enriched       videos that received full metadata from the YouTube API
     * @param markedInactive videos the YouTube API returned no data for (deleted / private)
     * @param failedBatches  API batches that threw (network / quota); affected videos are untouched
     */
    public record EnrichmentResult(int enriched, int markedInactive, int failedBatches) {
        public static EnrichmentResult empty() { return new EnrichmentResult(0, 0, 0); }
    }

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
            String uploadsPlaylistId = youTubeService.getUploadsPlaylistId(dto.channelId());
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

        // Enrich video metadata (title, publishedAt, viewCount, likeCount, commentCount,
        // thumbnailUrl, duration) for the videos we just upserted.  Without this step every
        // video row is stored with only videoId + channel_id set, leaving the Videos page
        // showing bare IDs and blank stats.
        EnrichmentResult enrichResult = EnrichmentResult.empty();
        try {
            enrichResult = enrichVideoMetadata(savedChannel.getId());
            log.info("syncChannelOnly: channelId={} enriched={} markedInactive={} failedBatches={}",
                    dto.channelId(), enrichResult.enriched(), enrichResult.markedInactive(), enrichResult.failedBatches());
            if (enrichResult.failedBatches() > 0) {
                warnings.add("Enrichment partial: " + enrichResult.failedBatches() + " API batch(es) failed; "
                        + enrichResult.enriched() + " video(s) enriched.");
            }
        } catch (Exception e) {
            warnings.add("Video metadata enrichment failed: " + e.getMessage());
            log.warn("syncChannelOnly: enrichment failed for channelId={}: {}", dto.channelId(), e.getMessage(), e);
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
        res.resolved.channelId = dto.channelId();
        res.resolved.resolvedFrom = resolved.type().name();
        res.resolved.normalizedInput = resolved.resolvedChannelId();

        res.result = new YouTubeSyncResponseDto.Result();
        res.result.pagesFetched = pagesFetched;
        res.result.pageSize = pageSize;
        res.result.videosFetched = videosFetched;
        res.result.videosSaved = videosSaved;
        res.result.videosUpdated = videosUpdated;
        res.result.videosEnriched = enrichResult.enriched();
        res.result.enrichmentErrors = enrichResult.failedBatches();

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
     * Incremental video sync using the lastVideoSyncAt cursor.
     *
     * <p>Fetches the uploads playlist newest-first and stops pagination when the next
     * page token is exhausted or when we reach a video already older than the cursor.
     * Capped at 5 pages (250 videos) per run to bound API quota usage.
     *
     * <p>Does NOT fall back to a full sync  -  the caller (DailyRefreshWorker) is
     * responsible for providing an appropriate initial cursor (typically 30-day backfill).
     *
     * @param channelId     YouTube channel ID string (e.g. "UCxxxxxx")
     * @param publishedAfter cursor  -  only fetch videos published strictly after this instant
     * @return number of video rows upserted
     */
    @Transactional
    public int syncIncrementalVideos(String channelId, Instant publishedAfter) {
        YouTubeChannel channel = channelRepository.findByChannelId(channelId)
                .orElseThrow(() -> new NotFoundException("Channel not found for incremental sync: " + channelId));

        String uploadsPlaylistId;
        try {
            uploadsPlaylistId = youTubeService.getUploadsPlaylistId(channelId);
        } catch (Exception e) {
            log.warn("syncIncrementalVideos: could not get uploads playlist channelId={}: {}", channelId, e.getMessage());
            return 0;
        }

        String pageToken = null;
        int synced = 0;
        final int MAX_PAGES = 5;

        for (int page = 0; page < MAX_PAGES; page++) {
            YouTubePlaylistItemsResponse playlistPage;
            try {
                playlistPage = youTubeService.getUploadsVideoIdsPage(uploadsPlaylistId, pageToken, 50);
            } catch (Exception e) {
                log.warn("syncIncrementalVideos: playlist page fetch failed page={} channelId={}: {}",
                        page, channelId, e.getMessage());
                break;
            }

            if (playlistPage == null || playlistPage.items == null || playlistPage.items.isEmpty()) break;

            boolean cursorReached = false;
            for (var item : playlistPage.items) {
                String videoId = null;
                if (item.contentDetails != null && item.contentDetails.videoId != null) {
                    videoId = item.contentDetails.videoId;
                } else if (item.snippet != null
                        && item.snippet.resourceId != null
                        && item.snippet.resourceId.videoId != null) {
                    videoId = item.snippet.resourceId.videoId;
                }
                if (videoId == null || videoId.isBlank()) continue;

                // Stop pagination once we reach a video published at or before the cursor.
                // playlist items are returned newest-first, so the first item older than the
                // cursor means all subsequent items are also older.
                if (item.snippet != null && item.snippet.publishedAt != null) {
                    try {
                        Instant videoPublishedAt = Instant.parse(item.snippet.publishedAt);
                        if (!videoPublishedAt.isAfter(publishedAfter)) {
                            cursorReached = true;
                            break;
                        }
                    } catch (Exception ignored) {
                        // Malformed publishedAt  -  include this video and keep going
                    }
                }

                upsertVideo(videoId, channel);
                synced++;
            }

            if (cursorReached) break;
            pageToken = playlistPage.nextPageToken;
            if (pageToken == null || pageToken.isBlank()) break;
        }

        log.info("syncIncrementalVideos: channelId={} upserted={} cursor={}", channelId, synced, publishedAfter);
        return synced;
    }

    /**
     * Idempotent per-day channel snapshot.
     * Runs in its own transaction (REQUIRES_NEW) so a duplicate-key hit never
     * poisons the caller's transaction. Check-before-insert prevents the constraint
     * violation on normal repeated runs; the catch handles the race-condition case.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeChannelSnapshotIfNeeded(Long channelDbId, LocalDate dayUtc) {
        // Fast path: already have a snapshot for today  -  nothing to do.
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
        snap.setSource(DataSource.PUBLIC);

        try {
            channelSnapshotRepository.saveAndFlush(snap);
        } catch (DataIntegrityViolationException ignore) {
            // Race condition: another thread inserted between our check and insert  -  fine.
        }
    }


    /**
     * Idempotent per-day video snapshot.
     * Same REQUIRES_NEW + check-before-insert pattern as the channel snapshot.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeVideoSnapshotIfNeeded(Long videoDbId, LocalDate dayUtc) {
        // Fast path: already have a snapshot for today  -  nothing to do.
        if (videoSnapRepo.existsByVideo_IdAndCapturedDayUtc(videoDbId, dayUtc)) {
            return;
        }

        // findById runs in this REQUIRES_NEW transaction (T2), which has READ COMMITTED
        // isolation and cannot see rows inserted by the still-open outer T1.  Videos that
        // were just upserted by syncIncrementalVideos() in the same outer T1 will appear
        // missing here.  Soft-skip them: they will be snapshotted on the next refresh run
        // once T1 has committed and the rows become visible to new transactions.
        Optional<YouTubeVideo> videoOpt = videoRepository.findById(videoDbId);
        if (videoOpt.isEmpty()) {
            log.debug("writeVideoSnapshotIfNeeded: videoDbId={} not visible in this transaction " +
                    "(likely inserted in the current outer T1, will snapshot on next run)", videoDbId);
            return;
        }
        YouTubeVideo v = videoOpt.get();

        VideoMetricsSnapshot snap = new VideoMetricsSnapshot();
        snap.setVideo(v);
        snap.setCapturedAt(Instant.now());
        snap.setCapturedDayUtc(dayUtc);
        snap.setViewCount(v.getViewCount());
        snap.setLikeCount(v.getLikeCount());
        snap.setCommentCount(v.getCommentCount());
        snap.setSource(DataSource.PUBLIC);

        try {
            videoSnapRepo.saveAndFlush(snap);
        } catch (DataIntegrityViolationException ignore) {
            // Race condition: another thread inserted between our check and insert  -  fine.
        }
    }

    /**
     * Persists refresh status + error message for a channel in an independent transaction.
     * REQUIRES_NEW ensures the write always commits even if the caller's transaction is
     * already marked rollback-only (which happens when a @Transactional(REQUIRED) method
     * throws and Spring marks the outer transaction for rollback before the catch block runs).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistChannelRefreshStatus(Long channelDbId, RefreshStatus status, String errorMsg) {
        YouTubeChannel ch = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found id=" + channelDbId));
        ch.setLastRefreshStatus(status);
        ch.setLastRefreshError(errorMsg);
        channelRepository.save(ch);
        log.info("persistChannelRefreshStatus: channelDbId={} status={}", channelDbId, status);
    }

    // =========================
    // Channel metadata refresh
    // =========================

    /**
     * Fetches the latest channel metadata from YouTube and upserts it into the DB.
     * Called by {@link com.LogicGraph.sociallens.jobs.DailyRefreshWorker} on every refresh run
     * so that subscriber counts, view counts, and title stay current.
     */
    @Transactional
    public void refreshChannelMetadata(String channelId) {
        try {
            ChannelSummaryDto dto = youTubeService.getChannelSummaryByChannelId(channelId);
            upsertChannel(dto);
            log.info("refreshChannelMetadata: updated channelId={}", channelId);
        } catch (Exception e) {
            log.warn("refreshChannelMetadata: failed for channelId={}: {}", channelId, e.getMessage(), e);
            throw e;
        }
    }

    // =========================
    // Video enrichment
    // =========================

    /**
     * Loads up to 200 stored videoIds for the given channel, calls videos.list
     * (snippet, contentDetails, statistics) in batches, and upserts the metadata
     * back into the existing YOUTUBE_VIDEO rows in a single saveAll transaction.
     *
     * <p>Uses per-batch error handling in {@code fetchVideoDetails}, so a single
     * failed batch does not abort enrichment for the rest of the channel's videos.
     *
     * @return {@link EnrichmentResult} with enriched / markedInactive / failedBatches counts
     */
    @Transactional
    public EnrichmentResult enrichVideoMetadata(Long channelDbId) {
        List<String> videoIds = videoRepository.findVideoIdsByChannelDbId(
                channelDbId, PageRequest.of(0, 200));
        log.info("enrichVideoMetadata: channelDbId={} discovered {} stored videoIds",
                channelDbId, videoIds.size());

        if (videoIds.isEmpty()) return EnrichmentResult.empty();

        List<YouTubeVideosResponse.Item> items;
        try {
            items = youTubeService.fetchVideoDetails(videoIds);
        } catch (Exception e) {
            log.warn("enrichVideoMetadata: fetchVideoDetails failed entirely for channelDbId={}: {}",
                    channelDbId, e.getMessage(), e);
            return new EnrichmentResult(0, 0, 1);
        }

        log.info("enrichVideoMetadata: channelDbId={} YouTube API returned {} item(s) for {} videoId(s)",
                channelDbId, items.size(), videoIds.size());

        Map<String, YouTubeVideosResponse.Item> detailMap = items.stream()
                .filter(i -> i.id != null)
                .collect(Collectors.toMap(i -> i.id, i -> i, (a, b) -> a));

        List<YouTubeVideo> videos = videoRepository.findAllByVideoIdIn(videoIds);
        List<YouTubeVideo> toSave = new ArrayList<>();
        int enrichedCount = 0;
        int markedInactiveCount = 0;

        for (YouTubeVideo video : videos) {
            YouTubeVideosResponse.Item detail = detailMap.get(video.getVideoId());
            if (detail == null) {
                // YouTube returned no data for this videoId: deleted or made private.
                if (video.isActive()) {
                    video.setActive(false);
                    toSave.add(video);
                    markedInactiveCount++;
                    log.info("enrichVideoMetadata: marking videoId={} inactive (not returned by YouTube API)",
                            video.getVideoId());
                }
                continue;
            }
            video.setActive(true); // re-activate if it was previously marked inactive
            applyVideoDetails(video, detail);
            toSave.add(video);
            enrichedCount++;
        }

        videoRepository.saveAll(toSave);
        log.info("enrichVideoMetadata: channelDbId={} enriched={} markedInactive={} totalSaved={}",
                channelDbId, enrichedCount, markedInactiveCount, toSave.size());
        return new EnrichmentResult(enrichedCount, markedInactiveCount, 0);
    }

    private void applyVideoDetails(YouTubeVideo video, YouTubeVideosResponse.Item item) {
        if (item.snippet != null) {
            video.setTitle(item.snippet.title);
            video.setDescription(item.snippet.description);
            if (item.snippet.publishedAt != null) {
                try {
                    video.setPublishedAt(Instant.parse(item.snippet.publishedAt));
                } catch (Exception ignored) {
                    // malformed date  -  leave publishedAt unchanged
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
                .findByChannelId(dto.channelId())
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId());
        channel.setTitle(dto.title());
        channel.setDescription(dto.description());
        channel.setViewCount(dto.viewCount());
        channel.setSubscriberCount(dto.subscriberCount());
        channel.setVideoCount(dto.videoCount());

        return channelRepository.save(channel);
    }

    private boolean upsertVideo(String videoId, YouTubeChannel channel) {
        Optional<YouTubeVideo> existing = videoRepository.findByVideoId(videoId);
        YouTubeVideo video = existing.orElseGet(YouTubeVideo::new);

        video.setVideoId(videoId);
        video.setChannel(channel);

        videoRepository.save(video);
        return existing.isEmpty();
    }
}
