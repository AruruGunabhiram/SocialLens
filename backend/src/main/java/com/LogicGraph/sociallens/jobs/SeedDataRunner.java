package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.service.youtube.YouTubeSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Seeds one well-known channel (@mkbhd) on first startup when the
 * {@code youtube_channel} table is empty and the opt-in flag is set.
 *
 * <p>Enable in {@code application-local.properties}:
 * <pre>sociallens.seed.enabled=true</pre>
 *
 * <p>The runner is a no-op if the table already contains rows, so it is
 * safe to leave enabled across restarts.
 */
@Component
@ConditionalOnProperty(name = "sociallens.seed.enabled", havingValue = "true")
public class SeedDataRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataRunner.class);
    private static final String SEED_CHANNEL = "@mkbhd";

    private final YouTubeChannelRepository channelRepository;
    private final YouTubeSyncService syncService;

    public SeedDataRunner(YouTubeChannelRepository channelRepository,
                          YouTubeSyncService syncService) {
        this.channelRepository = channelRepository;
        this.syncService = syncService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (channelRepository.count() > 0) {
            log.info("SeedDataRunner: youtube_channel table is not empty  -  skipping seed");
            return;
        }

        log.info("SeedDataRunner: table is empty, seeding demo channel '{}'", SEED_CHANNEL);
        try {
            var result = syncService.syncChannel(SEED_CHANNEL);
            log.info("SeedDataRunner: seed complete  -  {} videos processed, {} API calls used (channelId={}, status={})",
                    result.videosProcessed(), result.apiCallsUsed(), result.channelId(), result.status());
        } catch (Exception e) {
            // A seed failure must never prevent the application from starting.
            log.error("SeedDataRunner: seed failed for '{}'  -  continuing startup: {}",
                    SEED_CHANNEL, e.getMessage(), e);
        }
    }
}
