// Changelog: Use DB-limited video query, keep snapshots and refresh flow intact.
package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.YouTubeService;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Component
public class DailyRefreshWorker {

    private final JobProperties props;
    private static final Logger log = LoggerFactory.getLogger(DailyRefreshWorker.class);

    private final YouTubeChannelRepository channelRepo;
    private final YouTubeVideoRepository videoRepo;
    private final YouTubeService ytService;
    private final YouTubeSyncService syncService;

    public DailyRefreshWorker(
            YouTubeChannelRepository channelRepo,
            YouTubeVideoRepository videoRepo,
            YouTubeService ytService,
            JobProperties props,
            YouTubeSyncService syncService) {
        this.channelRepo = channelRepo;
        this.videoRepo = videoRepo;
        this.ytService = ytService;
        this.props = props;
        this.syncService = syncService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refreshOneChannel(Long channelDbId) {
        YouTubeChannel ch = channelRepo.findById(channelDbId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found id=" + channelDbId));

        Instant started = Instant.now();
        LocalDate todayUtc = LocalDate.now(ZoneOffset.UTC);

        try {
            // 1) Refresh channel metadata (Data API)
            ytService.refreshChannelMetadata(ch.getChannelId());

            // 2) Incremental video sync (Data API)
            Instant since = ch.getLastVideoSyncAt();
            if (since == null) {
                // first run: backfill last 30 days
                since = Instant.now().minusSeconds(30L * 24 * 3600);
            }

            // Capture a cursor *now*, but DO NOT persist it yet.
            // We only persist after the whole refresh succeeds (including snapshots).
            Instant newCursor = Instant.now();

            int newOrUpdated = syncService.syncIncrementalVideos(ch.getChannelId(), since);

            // 3) Write daily snapshots (idempotent)
            // IMPORTANT: these should be DB-guarded with UNIQUE(channel_id, day) and
            // UNIQUE(video_id, day)
            // and catch DataIntegrityViolationException inside the writer methods.
            syncService.writeChannelSnapshotIfNeeded(ch.getId(), todayUtc);

            // Snapshot videos with a cap (prevents huge channels melting the job)
            int maxVideos = props.getDailyRefresh().getMaxVideosPerChannelPerRun();
            var videos = videoRepo.findByChannel_ChannelId(
                    ch.getChannelId(),
                    PageRequest.of(0, maxVideos, Sort.by(Sort.Direction.DESC, "publishedAt")));

            for (var v : videos) {
                syncService.writeVideoSnapshotIfNeeded(v.getId(), todayUtc);
            }

            // Only now: advance cursor, mark success
            ch.setLastVideoSyncAt(newCursor);
            ch.setLastSuccessfulRefreshAt(Instant.now());
            ch.setLastRefreshStatus(RefreshStatus.SUCCESS);
            ch.setLastRefreshError(null);
            channelRepo.save(ch);

            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.info(
                    "DailyRefreshWorker success channelId={} channelDbId={} newOrUpdatedVideos={} totalVideos={} dayUtc={} ms={}",
                    ch.getChannelId(), ch.getId(), newOrUpdated, videos.size(), todayUtc, ms);

        } catch (Exception ex) {
            // DO NOT advance cursor on failure
            ch.setLastRefreshStatus(RefreshStatus.FAILED);
            ch.setLastRefreshError(safeErr(ex));
            channelRepo.save(ch);

            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.warn("DailyRefreshWorker FAILED channelId={} channelDbId={} dayUtc={} ms={} err={}",
                    ch.getChannelId(), ch.getId(), todayUtc, ms, ex.getMessage(), ex);

            throw ex;
        }
    }

    private String safeErr(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null)
            return ex.getClass().getSimpleName();
        return msg.length() > 800 ? msg.substring(0, 800) : msg;
    }
}
