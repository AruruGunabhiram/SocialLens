package com.LogicGraph.sociallens.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class YouTubeConfig {
    public static final String API_KEY = System.getenv("YOUTUBE_API_KEY");
    public static final String BASE_URL = "https://www.googleapis.com/youtube/v3";

    // Optional: commonly used "parts" so we don’t repeat strings everywhere
    public static final String CHANNEL_PARTS = "snippet,statistics,contentDetails";

}
