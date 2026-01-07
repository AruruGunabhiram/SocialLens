package com.LogicGraph.sociallens.dto.youtube;

public class ChannelSummaryDto {
    public String channelId;
    public String title;
    public String description;
    public long views;
    public long subscribers;
    public long videos;

    public ChannelSummaryDto(String channelId, String title, String description, long views, long subscribers, long videos) {
        this.channelId = channelId;
        this.title = title;
        this.description = description;
        this.views = views;
        this.subscribers = subscribers;
        this.videos = videos;
    }
}
