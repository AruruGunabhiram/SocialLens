package com.LogicGraph.sociallens.dto.youtube;

import java.util.List;

/**
 * DTO for YouTube Data API: playlistItems.list
 * https://www.googleapis.com/youtube/v3/playlistItems
 */
public class YouTubePlaylistItemsResponse {

    public String nextPageToken;
    public List<Item> items;

    public static class Item {
        public ContentDetails contentDetails;
        public Snippet snippet;
    }

    public static class ContentDetails {
        public String videoId;
        // optional fields exist in API, but not needed now:
        // public String videoPublishedAt;
    }

    public static class Snippet {
        public String title;
        public String publishedAt;

        public ResourceId resourceId;

        public static class ResourceId {
            public String videoId;
        }
    }
}
