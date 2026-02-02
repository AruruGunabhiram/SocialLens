package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.service.YouTubeService;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
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

    private static final Logger log = LoggerFactory.getLogger(DailyRefreshWorker.class);

    private final YouTubeChannelRepository channelRepo;
    private final YouTubeVideoRepository videoRepo;
    private final YouTubeService ytService;
    private final YouTubeSyncService syncService;

    public DailyRefreshWorker(
            YouTubeChannelRepository channelRepo,
            YouTubeVideoRepository videoRepo,
            YouTubeService ytService,
            YouTubeSyncService syncService
    ) {
        this.channelRepo = channelRepo;
        this.videoRepo = videoRepo;
        this.ytService = ytService;
        this.syncService = syncService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refreshOneChannel(Long channelDbId) {
        YouTubeChannel ch = channelRepo.findById(channelDbId)
                .orElseThrow(() -> new IllegalArgumentException("Channel not found id=" + channelDbId));

        Instant started = Instant.now();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        try {
            // 1) Refresh channel metadata (Data API)
            ytService.refreshChannelMetadata(ch.getChannelId());

            // 2) Incremental video sync (Data API)
            Instant since = ch.getLastVideoSyncAt();
            if (since == null) {
                // first run: backfill last 30 days
                since = Instant.now().minusSeconds(30L * 24 * 3600);
            }

            int newOrUpdated = syncService.syncIncrementalVideos(ch.getChannelId(), since);

            // Only advance cursor if incremental sync completed
            ch.setLastVideoSyncAt(Instant.now());

            // 3) Write daily snapshots (idempotent)
            syncService.writeChannelSnapshotIfNeeded(ch.getChannelId(), today);

            // Snapshot ALL videos for now (since you don't have viewCount)
            var videos = videoRepo.findAllByChannel_ChannelId(ch.getChannelId());
            for (var v : videos) {
                syncService.writeVideoSnapshotIfNeeded(v.getId(), today);
            }

            // 4) success status
            ch.setLastSuccessfulRefreshAt(Instant.now());
            ch.setLastRefreshStatus(RefreshStatus.SUCCESS);
            ch.setLastRefreshError(null);
            channelRepo.save(ch);

            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.info("DailyRefreshWorker success channelId={} newOrUpdatedVideos={} totalVideos={} ms={}",
                    ch.getChannelId(), newOrUpdated, videos.size(), ms);

        } catch (Exception ex) {
            ch.setLastRefreshStatus(RefreshStatus.FAILED);
            ch.setLastRefreshError(safeErr(ex));
            channelRepo.save(ch);

            long ms = Instant.now().toEpochMilli() - started.toEpochMilli();
            log.warn("DailyRefreshWorker FAILED channelId={} ms={} err={}",
                    ch.getChannelId(), ms, ex.getMessage(), ex);

            throw ex;
        }
    }

    private String safeErr(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null) return ex.getClass().getSimpleName();
        return msg.length() > 800 ? msg.substring(0, 800) : msg;
    }
}
