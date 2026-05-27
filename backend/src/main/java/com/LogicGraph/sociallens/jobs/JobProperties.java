// Changelog: Bind all configured job properties including API call caps and per-job limits.
package com.LogicGraph.sociallens.jobs;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sociallens.jobs")
public class JobProperties {

    private boolean enabled = false;

    private final DailyRefresh dailyRefresh = new DailyRefresh();
    private final OAuthRefresh oauthRefresh = new OAuthRefresh();

    // Hard caps per run (guardrails)
    private int maxChannelsPerRun = 25;

    /**
     * UNUSED — bound from {@code sociallens.jobs.max-api-calls-per-run} but never read by
     * any job.  The intended enforcement mechanism is {@link ApiCallBudget}, which tracks
     * the YouTube Data API daily quota (configured via {@code app.api.daily-quota}) and
     * resets at midnight UTC.  {@code ApiCallBudget} is currently initialised as a Spring
     * bean but is not yet injected into the job flow.
     *
     * <p>TODO: either wire {@code ApiCallBudget.decrement()} into {@link DailyRefreshWorker}
     * before each API call (single-instance only), or remove this field and the matching
     * property once a distributed quota solution is in place.
     */
    private int maxApiCallsPerRun = 400;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public DailyRefresh getDailyRefresh() { return dailyRefresh; }
    public OAuthRefresh getOauthRefresh() { return oauthRefresh; }

    public int getMaxChannelsPerRun() { return maxChannelsPerRun; }
    public void setMaxChannelsPerRun(int maxChannelsPerRun) { this.maxChannelsPerRun = maxChannelsPerRun; }

    public int getMaxApiCallsPerRun() { return maxApiCallsPerRun; }
    public void setMaxApiCallsPerRun(int maxApiCallsPerRun) { this.maxApiCallsPerRun = maxApiCallsPerRun; }

    public static class DailyRefresh {
        private boolean enabled = true;
        private int maxChannelsPerRun = 25;
        private String cron = "0 15 3 * * *"; // 03:15 daily (server time)
        private int maxVideosPerChannelPerRun = 400;
        private int maxApiCallsPerRun = 400;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    
        public int getMaxChannelsPerRun() { return maxChannelsPerRun; }
        public void setMaxChannelsPerRun(int maxChannelsPerRun) { this.maxChannelsPerRun = maxChannelsPerRun; }
    
        public String getCron() { return cron; }
        public void setCron(String cron) { this.cron = cron; }

        public int getMaxVideosPerChannelPerRun() { return maxVideosPerChannelPerRun; }
        public void setMaxVideosPerChannelPerRun(int maxVideosPerChannelPerRun) { this.maxVideosPerChannelPerRun = maxVideosPerChannelPerRun; }

        /**
         * UNUSED — bound from {@code sociallens.jobs.daily-refresh.max-api-calls-per-run} but
         * never read by {@link DailyRefreshJob} or {@link DailyRefreshWorker}.
         *
         * <p>The intended enforcement mechanism is {@link ApiCallBudget} (global, per-JVM daily
         * counter).  That bean is not yet wired into the refresh flow.
         *
         * <p>TODO: inject {@code ApiCallBudget} into {@link DailyRefreshWorker} and call
         * {@code decrement()} before each YouTube Data API call, returning early (with a
         * QUOTA_EXHAUSTED status on the channel) when the budget is empty.
         */
        public int getMaxApiCallsPerRun() { return maxApiCallsPerRun; }
        public void setMaxApiCallsPerRun(int maxApiCallsPerRun) { this.maxApiCallsPerRun = maxApiCallsPerRun; }
    }

    public static class OAuthRefresh {
        private boolean enabled = true;
        private String cron = "0 0 */6 * * *"; // every 6 hours
        private int maxAccountsPerRun = 200;
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getCron() { return cron; }
        public void setCron(String cron) { this.cron = cron; }
        public int getMaxAccountsPerRun() { return maxAccountsPerRun; }
        public void setMaxAccountsPerRun(int maxAccountsPerRun) { this.maxAccountsPerRun = maxAccountsPerRun; }
    }
}
