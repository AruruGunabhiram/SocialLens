// Changelog: Use DB-limited video query, keep snapshots and refresh flow intact.
package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.exception.RefreshAlreadyRunningException;
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
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DailyRefreshWorker {

    private static final Logger log = LoggerFactory.getLogger(DailyRefreshWorker.class);

    /** In-memory guard: channelDbId -> time the refresh started. Prevents double-runs. */
    private final ConcurrentHashMap<Long, Instant> running = new ConcurrentHashMap<>();

    private final JobProperties props;

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
        // Concurrency guard: atomically claim this channel or reject if already running.
        if (running.putIfAbsent(channelDbId, Instant.now()) != null) {
            throw new RefreshAlreadyRunningException(channelDbId);
        }

        YouTubeChannel ch = channelRepo.findById(channelDbId)
                .orElseThrow(() -> {
                    running.remove(channelDbId);
                    return new IllegalArgumentException("Channel not found id=" + channelDbId);
                });

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

            // 2b) Enrich video metadata (snippet + statistics) for this channel
            int enriched = syncService.enrichVideoMetadata(ch.getId());
            log.info("DailyRefreshWorker enriched {} video rows for channelDbId={}", enriched, ch.getId());

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

            // Per-video try-catch: a single video that cannot be snapshotted (e.g. because it
            // was just inserted in this same T1 and is invisible to the REQUIRES_NEW T2, or
            // because of a transient DB error) must not abort the entire refresh.
            int snapOk = 0;
            int snapSkipped = 0;
            for (var v : videos) {
                try {
                    syncService.writeVideoSnapshotIfNeeded(v.getId(), todayUtc);
                    snapOk++;
                } catch (Exception snapEx) {
                    snapSkipped++;
                    log.warn("DailyRefreshWorker: skipped snapshot for videoDbId={} channelDbId={}: {}",
                            v.getId(), ch.getId(), snapEx.getMessage());
                }
            }

            // Only now: advance cursor, mark success
            ch.setLastVideoSyncAt(newCursor);
            ch.setLastSuccessfulRefreshAt(Instant.now());
            ch.setLastRefreshStatus(RefreshStatus.SUCCESS);
            ch.setLastRefreshError(null);
            channelRepo.save(ch);

            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.info(
                    "DailyRefreshWorker success channelId={} channelDbId={} newOrUpdatedVideos={} " +
                    "totalVideos={} snapOk={} snapSkipped={} dayUtc={} ms={}",
                    ch.getChannelId(), ch.getId(), newOrUpdated, videos.size(),
                    snapOk, snapSkipped, todayUtc, ms);

        } catch (Exception ex) {
            // Surface the original exception before anything else obscures it.
            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.error("DailyRefreshWorker FAILED channelId={} channelDbId={} dayUtc={} ms={}",
                    ch.getChannelId(), ch.getId(), todayUtc, ms, ex);

            // Persist failure status in a new independent transaction.
            // The current transaction (T1) may already be marked rollback-only if a
            // @Transactional(REQUIRED) inner method threw — in that case channelRepo.save(ch)
            // inside T1 would itself throw "Transaction silently rolled back because it has been
            // marked as rollback-only", masking the real error. REQUIRES_NEW sidesteps that.
            try {
                syncService.persistChannelRefreshStatus(ch.getId(), RefreshStatus.FAILED, safeErr(ex));
            } catch (Exception saveEx) {
                log.error("DailyRefreshWorker: could not persist FAILED status for channelDbId={}: {}",
                        ch.getId(), saveEx.getMessage(), saveEx);
            }

            throw ex;
        } finally {
            running.remove(channelDbId);
        }
    }

    private String safeErr(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null)
            return ex.getClass().getSimpleName();
        return msg.length() > 800 ? msg.substring(0, 800) : msg;
    }
}
