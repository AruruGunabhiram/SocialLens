package com.LogicGraph.sociallens.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Prevents rapid sequential refreshes of the same channel by tracking the last
 * completed refresh time per channel and enforcing a minimum cooldown window.
 *
 * <h3>Purpose</h3>
 * <p>The {@link DailyRefreshWorker} already guards against <em>concurrent</em> runs of the
 * same channel (it rejects a second call while one is still in-flight).  This class
 * handles the complementary case: a user who triggers refresh, waits for it to finish,
 * and then immediately triggers it again.  Without this guard every click would
 * fire a new refresh, burning quota with no benefit to the user.
 *
 * <h3>Scope</h3>
 * <p>In-memory only — counter is per-JVM.  Sufficient for the single-instance local/dev
 * deployment this app targets.  A multi-instance setup would require a shared store
 * (e.g. Redis) for cross-instance coordination; that is out of scope here.
 *
 * <p>Cooldown is configurable via {@code sociallens.sync.cooldown-seconds}
 * (default: 30 seconds).
 */
@Component
public class SyncCooldownGuard {

    private static final Logger log = LoggerFactory.getLogger(SyncCooldownGuard.class);

    /** Maps channelDbId → time the most recent refresh completed. */
    private final ConcurrentHashMap<Long, Instant> lastCompleted = new ConcurrentHashMap<>();

    private final int cooldownSeconds;

    public SyncCooldownGuard(
            @Value("${sociallens.sync.cooldown-seconds:30}") int cooldownSeconds) {
        this.cooldownSeconds = cooldownSeconds;
        log.info("SyncCooldownGuard initialised: cooldown={}s", cooldownSeconds);
    }

    /**
     * Returns {@code true} if the channel's last completed refresh is within the cooldown window.
     * A channel that has never been refreshed (no entry in the map) is never on cooldown.
     */
    public boolean isOnCooldown(Long channelDbId) {
        Instant last = lastCompleted.get(channelDbId);
        if (last == null) return false;
        return Instant.now().isBefore(last.plusSeconds(cooldownSeconds));
    }

    /**
     * Records that a refresh for the given channel just completed successfully.
     * Subsequent calls to {@link #isOnCooldown} will return {@code true} for the
     * next {@code cooldownSeconds}.
     */
    public void recordCompleted(Long channelDbId) {
        lastCompleted.put(channelDbId, Instant.now());
        log.debug("SyncCooldownGuard: recorded completion channelDbId={}", channelDbId);
    }

    /**
     * Returns the number of seconds remaining in the current cooldown window,
     * or {@code 0} if the channel is not on cooldown.
     */
    public long secondsRemaining(Long channelDbId) {
        Instant last = lastCompleted.get(channelDbId);
        if (last == null) return 0;
        long remaining = last.plusSeconds(cooldownSeconds).getEpochSecond()
                - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }

    /** Returns the configured cooldown window in seconds. */
    public int getCooldownSeconds() {
        return cooldownSeconds;
    }
}
