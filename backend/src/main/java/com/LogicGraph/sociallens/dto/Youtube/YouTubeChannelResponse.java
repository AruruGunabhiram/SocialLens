package com.LogicGraph.sociallens.dto.youtube;

import java.util.List;

// Matches the outer YouTube API response for channels.list
public class YouTubeChannelResponse {
    public List<Item> items;

    public static class Item {
        public String id;
        public Snippet snippet;
        public Statistics statistics;
    }

    public static class Snippet {
        public String title;
        public String description;
    }

    public static class Statistics {
        public String viewCount;
        public String subscriberCount;
        public String videoCount;
    }
}
