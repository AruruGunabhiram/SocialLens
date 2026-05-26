package com.LogicGraph.sociallens.dto.youtube;

import java.util.List;

// Matches the outer YouTube API response for channels.list
public class YouTubeChannelResponse {

    public List<Item> items;

    public static class Item {
        public String id;
        public Snippet snippet;
        public Statistics statistics;
        public ContentDetails contentDetails;
    }

    public static class ContentDetails {
        public RelatedPlaylists relatedPlaylists;
    }

    public static class RelatedPlaylists {
        public String uploads; // THIS is the key field
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
