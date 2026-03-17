package com.LogicGraph.sociallens.jobs;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tracks the daily YouTube Data API call budget.
 * Budget is loaded from {@code app.api.daily-quota} and reset at midnight UTC.
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
