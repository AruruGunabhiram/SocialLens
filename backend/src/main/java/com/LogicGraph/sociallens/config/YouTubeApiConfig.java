package com.LogicGraph.sociallens.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Centralises YouTube API credentials and exposes typed client beans.
 * Credentials are loaded from properties / environment variables only —
 * never logged or returned in any response.
 */
@Configuration
public class YouTubeApiConfig {

    @Value("${youtube.api.key:}")
    private String apiKey;

    @Value("${youtube.oauth.client-id:}")
    private String clientId;

    @Value("${youtube.oauth.client-secret:}")
    private String clientSecret;

    /** RestTemplate wired for YouTube Data API v3 calls. */
    @Bean("youTubeDataClient")
    public RestTemplate youTubeDataClient() {
        return new RestTemplate();
    }

    /** RestTemplate wired for YouTube Analytics API calls. */
    @Bean("analyticsRestTemplate")
    public RestTemplate analyticsRestTemplate() {
        return new RestTemplate();
    }

    public String getApiKey() {
        return apiKey;
    }

    public String getClientId() {
        return clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }
}
