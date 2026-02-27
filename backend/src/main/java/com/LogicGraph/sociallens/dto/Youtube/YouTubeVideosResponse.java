package com.LogicGraph.sociallens.dto.youtube;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * DTO for YouTube Data API: videos.list
 * parts: snippet, contentDetails, statistics
 */
public class YouTubeVideosResponse {

    public List<Item> items;

    public static class Item {
        public String id;
        public Snippet snippet;
        public ContentDetails contentDetails;
        public Statistics statistics;
    }

    public static class Snippet {
        public String title;
        public String description;
        public String publishedAt;
        public String categoryId;
        public Thumbnails thumbnails;
    }

    public static class Thumbnails {
        @JsonProperty("default")
        public Thumbnail defaultThumb;
        public Thumbnail medium;
        public Thumbnail high;
    }

    public static class Thumbnail {
        public String url;
    }

    public static class ContentDetails {
        public String duration;
    }

    public static class Statistics {
        public String viewCount;
        public String likeCount;
        public String commentCount;
    }
}
