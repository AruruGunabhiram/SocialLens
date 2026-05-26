package com.LogicGraph.sociallens.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tracks the daily YouTube Data API call budget for this JVM instance.
 * Budget is loaded from {@code app.api.daily-quota} and reset at midnight UTC.
 *
 * <h3>Single-instance safety</h3>
 * <p>The counter is an in-memory {@link java.util.concurrent.atomic.AtomicInteger}.
 * It is <strong>only safe for single-instance deployments</strong>.  In a multi-instance
 * (horizontally-scaled) setup each JVM maintains its own independent counter; there is no
 * coordination between instances.  With N running instances the effective daily quota
 * consumed could be up to N × {@code app.api.daily-quota} calls before any instance's
 * local counter reaches zero.
 *
 * <p>A distributed quota solution would require a shared counter (e.g. Redis DECRBY with
 * a TTL-based reset, or a DB row with a daily watermark) and is not implemented here.
 *
 * <h3>Current wiring status</h3>
 * <p>This bean is instantiated by Spring but is <strong>not yet injected into the job
 * flow</strong>.  Neither {@link DailyRefreshJob} nor {@link DailyRefreshWorker} currently
 * calls {@link #decrement()}.  The bean therefore resets at midnight but never actually
 * enforces a limit during a refresh run.
 *
 * <p>TODO (single-instance wiring): inject this bean into {@link DailyRefreshWorker} and
 * call {@link #decrement()} before each YouTube Data API call.  When the budget is
 * exhausted ({@link #decrement()} returns {@code false}), stop processing further channels
 * and record a QUOTA_EXHAUSTED status so the next run can resume.
 */
@Component
public class ApiCallBudget {

    private static final Logger log = LoggerFactory.getLogger(ApiCallBudget.class);

    private final int dailyQuota;
    private final AtomicInteger remaining;

    public ApiCallBudget(@Value("${app.api.daily-quota}") int dailyQuota) {
        this.dailyQuota = dailyQuota;
        this.remaining = new AtomicInteger(dailyQuota);
        log.info("ApiCallBudget initialised: daily-quota={}", dailyQuota);
    }

    /**
     * Attempts to consume one unit from the budget.
     *
     * @return {@code true} if a unit was successfully consumed; {@code false} if the budget is exhausted.
     */
    public boolean decrement() {
        while (true) {
            int current = remaining.get();
            if (current <= 0) {
                log.warn("ApiCallBudget exhausted (remaining=0, daily={})", dailyQuota);
                return false;
            }
            if (remaining.compareAndSet(current, current - 1)) {
                log.debug("ApiCallBudget decremented: remaining={}", current - 1);
                return true;
            }
        }
    }

    /** Returns the total daily quota configured for this instance. */
    public int getDailyQuota() {
        return dailyQuota;
    }

    /** Returns the number of API call units remaining today. */
    public int getRemaining() {
        return remaining.get();
    }

    /** Resets the counter to the daily quota. Called by the scheduler at midnight UTC. */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    public void reset() {
        int previous = remaining.getAndSet(dailyQuota);
        log.info("ApiCallBudget reset: previous={} restored-to={}", previous, dailyQuota);
    }
}
