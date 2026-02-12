package com.LogicGraph.sociallens.dto.analytics;

public class YtAnalyticsSummaryDto {
    // public String channelId;

    public Long views;
    // public Long likes;
    // public Long comments;

    public Long subscribersGained;
    public Long subscribersLost;
    public Long netSubscribers;

    public Long estimatedMinutesWatched;
    public Long averageViewDurationSeconds; 
    
    public String startDate; // yyyy-mm-dd
    public String endDate;   // yyyy-mm-dd
}
