package com.LogicGraph.sociallens.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Central configuration for the YouTube Data API v3 and YouTube Analytics API.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Exposes API base URL and default resource-part constants used when building requests.</li>
 *   <li>Binds API key and OAuth credentials from Spring properties / environment variables.
 *       Credentials are never logged or included in any HTTP response.</li>
 *   <li>Registers named {@link RestTemplate} beans for the Data API and Analytics API so
 *       injection sites can {@code @Qualifier}-select the right client.</li>
 * </ul>
 */
@Configuration
public class YouTubeApiConfig {

    /** Base URL for all YouTube Data API v3 requests. */
    public static final String BASE_URL = "https://www.googleapis.com/youtube/v3";

    /**
     * Comma-separated resource parts requested when fetching channel details.
     * Includes {@code contentDetails} which is required to resolve the uploads playlist ID.
     */
    public static final String CHANNEL_PARTS = "snippet,statistics,contentDetails";

    @Value("${youtube.api.key:}")
    private String apiKey;

    @Value("${youtube.oauth.client-id:}")
    private String clientId;

    @Value("${youtube.oauth.client-secret:}")
    private String clientSecret;

    /** RestTemplate wired for YouTube Data API v3 calls. */
    @Bean("youTubeDataClient")
    public RestTemplate youTubeDataClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(15_000);
        return new RestTemplate(factory);
    }

    /** RestTemplate wired for YouTube Analytics API calls. */
    @Bean("analyticsRestTemplate")
    public RestTemplate analyticsRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(15_000);
        return new RestTemplate(factory);
    }

    /**
     * RestTemplate for OAuth token-exchange and refresh calls to Google's OAuth endpoints.
     * Uses tighter timeouts than the data-API clients since OAuth calls are synchronous
     * and block the user-facing request flow.
     */
    @Bean("oauthRestTemplate")
    public RestTemplate oauthRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return new RestTemplate(factory);
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
