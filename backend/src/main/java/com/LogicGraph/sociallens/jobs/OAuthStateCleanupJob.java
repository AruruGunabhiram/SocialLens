package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.OAuthStateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Periodically removes used and expired OAuth state tokens.
 * Runs every hour. Each state has a short TTL (typically 10 minutes),
 * so hourly cleanup keeps the table near-empty under normal traffic.
 */
@Component
public class OAuthStateCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(OAuthStateCleanupJob.class);

    private final OAuthStateRepository oAuthStateRepository;

    public OAuthStateCleanupJob(OAuthStateRepository oAuthStateRepository) {
        this.oAuthStateRepository = oAuthStateRepository;
    }

    @Scheduled(cron = "0 0 * * * *", zone = "UTC") // top of every hour
    @Transactional
    public void cleanupExpiredStates() {
        int deleted = oAuthStateRepository.deleteExpiredAndUsed(Instant.now());
        if (deleted > 0) {
            log.info("OAuthStateCleanupJob: deleted {} expired/used OAuth state row(s)", deleted);
        }
    }
}
