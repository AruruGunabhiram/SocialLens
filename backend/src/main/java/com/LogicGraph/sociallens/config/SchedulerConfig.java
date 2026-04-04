package com.LogicGraph.sociallens.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Enables Spring's scheduling subsystem and configures a shared thread pool for all
 * {@code @Scheduled} jobs ({@link com.LogicGraph.sociallens.jobs.DailyRefreshJob},
 * {@link com.LogicGraph.sociallens.jobs.OAuthAnalyticsRefreshJob}, etc.).
 *
 * <p>A pool size of 4 allows multiple jobs to run concurrently without starving each other.
 * All threads use the {@code sl-jobs-} prefix so they are easy to identify in thread dumps.
 * Uncaught exceptions are logged rather than silently swallowed.
 */
@Configuration
@EnableScheduling
public class SchedulerConfig {

    private static final Logger log = LoggerFactory.getLogger(SchedulerConfig.class);

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("sl-jobs-");
        scheduler.setErrorHandler(t -> log.error("Scheduled job crashed", t));
        scheduler.initialize();
        return scheduler;
    }
}
