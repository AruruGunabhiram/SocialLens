package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.enums.RefreshStatus;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * On every JVM startup, resets channels stuck in IN_PROGRESS to FAILED.
 *
 * <p>The in-memory concurrency guard in {@link DailyRefreshWorker} is cleared on restart,
 * but the database column retains IN_PROGRESS for channels that were mid-refresh when the
 * JVM crashed. Without this reset the job would treat those channels as permanently locked.
 */
@Component
public class ApplicationStartupListener {

    private static final Logger log = LoggerFactory.getLogger(ApplicationStartupListener.class);

    private final YouTubeChannelRepository channelRepository;

    public ApplicationStartupListener(YouTubeChannelRepository channelRepository) {
        this.channelRepository = channelRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void resetStaleLocks() {
        int reset = channelRepository.resetStaleLocks(
                RefreshStatus.IN_PROGRESS,
                RefreshStatus.FAILED,
                "Reset on startup: JVM restart cleared in-memory lock");
        if (reset > 0) {
            log.warn("ApplicationStartupListener: reset {} channel(s) from IN_PROGRESS to FAILED", reset);
        } else {
            log.info("ApplicationStartupListener: no stale IN_PROGRESS locks found");
        }
    }
}
