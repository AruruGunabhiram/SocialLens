package com.LogicGraph.sociallens.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class YouTubeConfig {
    // API key is injected via @Value("${youtube.api.key}") in each service that needs it.
    // Do not use System.getenv() here — it bypasses Spring’s property resolution.
    public static final String BASE_URL    = "https://www.googleapis.com/youtube/v3";
    public static final String CHANNEL_PARTS = "snippet,statistics,contentDetails";
}
