package com.LogicGraph.sociallens.jobs;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sociallens.jobs")
public class JobProperties {

    private boolean enabled = false;

    private final DailyRefresh dailyRefresh = new DailyRefresh();
    private final OAuthRefresh oauthRefresh = new OAuthRefresh();

    // Hard caps per run (guardrails)
    private int maxChannelsPerRun = 25;
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

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    
        public int getMaxChannelsPerRun() { return maxChannelsPerRun; }
        public void setMaxChannelsPerRun(int maxChannelsPerRun) { this.maxChannelsPerRun = maxChannelsPerRun; }
    
        public String getCron() { return cron; }
        public void setCron(String cron) { this.cron = cron; }

        public int getMaxVideosPerChannelPerRun() { return maxVideosPerChannelPerRun; }
        public void setMaxVideosPerChannelPerRun(int maxVideosPerChannelPerRun) { this.maxVideosPerChannelPerRun = maxVideosPerChannelPerRun; }
    }    

    public static class OAuthRefresh {
        private boolean enabled = true;
        private String cron = "0 0 */6 * * *"; // every 6 hours
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getCron() { return cron; }
        public void setCron(String cron) { this.cron = cron; }
    }
}
