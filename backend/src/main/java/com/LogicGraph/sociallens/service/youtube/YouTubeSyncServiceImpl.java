package com.LogicGraph.sociallens.service.youtube;

import com.LogicGraph.sociallens.dto.youtube.SyncResultDto;
import com.LogicGraph.sociallens.dto.youtube.VideoDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.VideoMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.enums.DataSource;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.exception.InsufficientApiQuotaException;
import com.LogicGraph.sociallens.exception.RateLimitException;
import com.LogicGraph.sociallens.exception.RateLimitExceededException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.resolver.ChannelResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates: resolve channel → fetch videos → upsert entities → write snapshots.
 * All public methods are transactional. Snapshots are INSERT-only (never overwritten).
 */
@Service
public class YouTubeSyncServiceImpl implements YouTubeSyncService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeSyncServiceImpl.class);

    /** Max videos fetched per sync run (one playlist page). */
    private static final int VIDEO_FETCH_LIMIT = 50;

    private final YouTubeService youTubeService;
    private final ChannelResolver channelResolver;
    private final YouTubeVideoRepository videoRepo;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepo;
    private final VideoMetricsSnapshotRepository videoSnapshotRepo;

    public YouTubeSyncServiceImpl(
            YouTubeService youTubeService,
            ChannelResolver channelResolver,
            YouTubeVideoRepository videoRepo,
            ChannelMetricsSnapshotRepository channelSnapshotRepo,
            VideoMetricsSnapshotRepository videoSnapshotRepo) {
        this.youTubeService = youTubeService;
        this.channelResolver = channelResolver;
        this.videoRepo = videoRepo;
        this.channelSnapshotRepo = channelSnapshotRepo;
        this.videoSnapshotRepo = videoSnapshotRepo;
    }

    // -------------------------------------------------------------------------
    // syncChannel
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public SyncResultDto syncChannel(String identifier) {
        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);

        // Step 1: resolve identifier → upserted YouTubeChannel
        YouTubeChannel channel = channelResolver.resolveToChannel(identifier);
        String channelId = channel.getChannelId();
        log.info("Sync started for {}", channelId);

        int videosProcessed = 0;
        int apiCallsUsed = 0;

        // Step 2: fetch videos from YouTube (consumes 1 budget unit)
        List<VideoDto> videos;
        try {
            videos = youTubeService.fetchVideosByChannelId(channelId, VIDEO_FETCH_LIMIT);
            apiCallsUsed++;
        } catch (RateLimitException | RateLimitExceededException | InsufficientApiQuotaException e) {
            log.warn("Sync PARTIAL for {} — rate limited or quota exhausted: {}", channelId, e.getMessage());
            channel.setLastRefreshStatus(RefreshStatus.FAILED);
            channel.setLastRefreshError(e.getMessage());
            return new SyncResultDto(channelId, 0, apiCallsUsed, now, "PARTIAL");
        }

        // Steps 3 & 5: upsert each video + write its snapshot; skip on per-video errors
        for (VideoDto videoDto : videos) {
            try {
                YouTubeVideo video = upsertVideo(channel, videoDto);
                writeVideoSnapshot(video, videoDto, now, today);
                videosProcessed++;
            } catch (Exception e) {
                log.error("Failed to process video {} for channel {}: {}",
                        videoDto.videoId(), channelId, e.getMessage(), e);
            }
        }

        // Step 4: write channel-level snapshot (INSERT only — skip if today's row exists)
        writeChannelSnapshot(channel, now, today);

        // Update channel refresh observability fields
        channel.setLastSuccessfulRefreshAt(now);
        channel.setLastRefreshStatus(RefreshStatus.SUCCESS);
        channel.setLastRefreshError(null);

        log.info("Sync complete for {}: {} videos, {} API calls", channelId, videosProcessed, apiCallsUsed);
        return new SyncResultDto(channelId, videosProcessed, apiCallsUsed, now, "OK");
    }

    // -------------------------------------------------------------------------
    // syncChannelIfStale
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public Optional<SyncResultDto> syncChannelIfStale(String channelId, Duration stalenessThreshold) {
        Optional<ChannelMetricsSnapshot> latest =
                channelSnapshotRepo.findTopByChannel_ChannelIdOrderByCapturedAtDesc(channelId);

        if (latest.isPresent()) {
            Instant capturedAt = latest.get().getCapturedAt();
            Instant staleAfter = Instant.now().minus(stalenessThreshold);
            if (capturedAt.isAfter(staleAfter)) {
                log.debug("syncChannelIfStale: skipping {} — snapshot is fresh (capturedAt={})",
                        channelId, capturedAt);
                return Optional.empty();
            }
        }

        // No snapshot exists, or it is older than the threshold — run full sync.
        // Note: self-call; runs within the transaction opened by this method.
        SyncResultDto result = syncChannel(channelId);
        return Optional.of(result);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /** Find-or-create a {@link YouTubeVideo} and update its fields from the API response. */
    private YouTubeVideo upsertVideo(YouTubeChannel channel, VideoDto dto) {
        YouTubeVideo video = videoRepo.findByVideoId(dto.videoId())
                .orElseGet(YouTubeVideo::new);

        video.setVideoId(dto.videoId());
        video.setChannel(channel);
        video.setTitle(dto.title());
        video.setThumbnailUrl(dto.thumbnailUrl());
        video.setPublishedAt(dto.publishedAt());
        video.setDuration(dto.duration());
        video.setViewCount(dto.viewCount());
        video.setLikeCount(dto.likeCount());
        video.setCommentCount(dto.commentCount());

        return videoRepo.save(video);
    }

    /**
     * Inserts a new {@link ChannelMetricsSnapshot} for today.
     * Skips silently if a row already exists for this channel on {@code dayUtc}.
     */
    private void writeChannelSnapshot(YouTubeChannel channel, Instant capturedAt, LocalDate dayUtc) {
        if (channelSnapshotRepo.existsByChannel_IdAndCapturedDayUtc(channel.getId(), dayUtc)) {
            log.debug("Channel snapshot already exists for {} on {} — skipping INSERT",
                    channel.getChannelId(), dayUtc);
            return;
        }

        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setChannel(channel);
        snap.setSubscriberCount(channel.getSubscriberCount());
        snap.setViewCount(channel.getViewCount());
        snap.setVideoCount(channel.getVideoCount());
        snap.setCapturedAt(capturedAt);
        snap.setCapturedDayUtc(dayUtc);
        snap.setSource(DataSource.PUBLIC);
        channelSnapshotRepo.save(snap);
    }

    /**
     * Inserts a new {@link VideoMetricsSnapshot} for today.
     * Skips silently if a row already exists for this video on {@code dayUtc}.
     */
    private void writeVideoSnapshot(YouTubeVideo video, VideoDto dto, Instant capturedAt, LocalDate dayUtc) {
        if (videoSnapshotRepo.existsByVideo_IdAndCapturedDayUtc(video.getId(), dayUtc)) {
            log.debug("Video snapshot already exists for {} on {} — skipping INSERT",
                    video.getVideoId(), dayUtc);
            return;
        }

        VideoMetricsSnapshot snap = new VideoMetricsSnapshot();
        snap.setVideo(video);
        snap.setViewCount(dto.viewCount());
        snap.setLikeCount(dto.likeCount());
        snap.setCommentCount(dto.commentCount());
        snap.setCapturedAt(capturedAt);
        snap.setCapturedDayUtc(dayUtc);
        snap.setSource(DataSource.PUBLIC);
        videoSnapshotRepo.save(snap);
    }
}
