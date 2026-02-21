package com.LogicGraph.sociallens.dto.analytics;

public class TimeSeriesPointDto {
    public String date;
    public Long views;
    public Long subscribers;
    public Long likes;
    public Long comments;
    public Long uploads;

    public TimeSeriesPointDto() {
    }

    public TimeSeriesPointDto(String date, Long views, Long subscribers, Long likes, Long comments, Long uploads) {
        this.date = date;
        this.views = views;
        this.subscribers = subscribers;
        this.likes = likes;
        this.comments = comments;
        this.uploads = uploads;
    }
}
