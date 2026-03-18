package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthCallbackResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.OAuthState;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.OAuthStateInvalidException;
import com.LogicGraph.sociallens.exception.TokenRefreshFailedException;
import com.LogicGraph.sociallens.repository.OAuthStateRepository;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class YouTubeOAuthService {

    private final OAuthStateRepository oAuthStateRepository;
    private final ConnectedAccountService connectedAccountService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    @Value("${google.oauth.redirect-uri}")
    private String redirectUri;

    private static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

    private static final List<String> SCOPES = List.of(
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/youtube.readonly"
    );

    public YouTubeOAuthService(
            OAuthStateRepository oAuthStateRepository,
            ConnectedAccountService connectedAccountService
    ) {
        this.oAuthStateRepository = oAuthStateRepository;
        this.connectedAccountService = connectedAccountService;
    }

    public OAuthStartResponse startOAuth(Long userId) {
        String state = UUID.randomUUID().toString();

        OAuthState os = new OAuthState();
        os.setState(state);
        os.setUserId(userId);
        os.setUsed(false);
        os.setExpiresAt(Instant.now().plusSeconds(600));
        oAuthStateRepository.save(os);

        String scopeParam = String.join(" ", SCOPES);

        String authUrl = UriComponentsBuilder
                .fromHttpUrl(AUTH_URL)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", scopeParam)
                .queryParam("access_type", "offline")
                .queryParam("prompt", "consent")
                .queryParam("state", state)
                .build()
                .encode()
                .toUriString();

        return new OAuthStartResponse(authUrl);
    }

    public OAuthCallbackResponse handleCallback(String code, String state) {
        OAuthState savedState = oAuthStateRepository.findByState(state)
                .orElseThrow(() -> new OAuthStateInvalidException("Invalid OAuth state: not found"));

        if (savedState.isUsed()) throw new OAuthStateInvalidException("OAuth state already used");
        if (savedState.getExpiresAt().isBefore(Instant.now())) throw new OAuthStateInvalidException("OAuth state expired");

        Map<String, Object> tokenResponse = exchangeCodeForTokens(code);

        String accessToken = tokenResponse.get("access_token").toString();
        String refreshToken = tokenResponse.get("refresh_token") == null
                ? null
                : tokenResponse.get("refresh_token").toString();

        long expiresIn = Long.parseLong(tokenResponse.get("expires_in").toString());
        Instant expiresAt = Instant.now().plusSeconds(expiresIn);

        String channelId = fetchChannelId(accessToken);

        ConnectAccountRequest req = new ConnectAccountRequest();
        req.setPlatform(Platform.YOUTUBE);
        req.setChannelId(channelId);
        req.setAccessToken(accessToken);
        req.setRefreshToken(refreshToken);
        req.setExpiresAt(expiresAt);
        req.setScopes(String.join(" ", SCOPES));

        ConnectedAccountResponse saved = connectedAccountService.upsertConnection(savedState.getUserId(), req);

        savedState.setUsed(true);
        oAuthStateRepository.save(savedState);

        return new OAuthCallbackResponse(true, "Connected: " + saved.getChannelId());
    }

    /**
     * Returns an access token valid "now".
     * If refreshed, persists updated tokens.
     */
    public String getValidAccessToken(ConnectedAccount account) {
        if (account == null) throw new IllegalArgumentException("ConnectedAccount is null");

        String accessToken = account.getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new TokenRefreshFailedException(String.valueOf(account.getId()), "missing access token");
        }

        Instant expiresAt = account.getExpiresAt();
        if (expiresAt == null) return accessToken; // best-effort

        boolean expiredOrNear = Instant.now().isAfter(expiresAt.minusSeconds(60));
        if (!expiredOrNear) return accessToken;

        String refreshToken = account.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new TokenRefreshFailedException(String.valueOf(account.getId()),
                    "access token expired and no refresh token available");
        }

        TokenRefreshResult refreshed;
        try {
            refreshed = refreshAccessToken(refreshToken);
        } catch (IllegalStateException ex) {
            throw new TokenRefreshFailedException(String.valueOf(account.getId()), ex.getMessage());
        }

        Instant newExpiresAt = Instant.now().plusSeconds(refreshed.expiresInSeconds());
        account.updateTokens(refreshed.accessToken(), null, newExpiresAt, account.getScopes());

        connectedAccountService.save(account);

        return account.getAccessToken();
    }

    /**
     * Job-friendly method: refresh only if needed.
     * Returns true only if refresh was performed and persisted.
     */
    public boolean refreshIfNeeded(ConnectedAccount acc) {
        if (acc == null) throw new IllegalArgumentException("ConnectedAccount is null");

        Instant expiresAt = acc.getExpiresAt();
        // If we have expiry and it is still valid for >60s, do nothing.
        if (expiresAt != null && Instant.now().isBefore(expiresAt.minusSeconds(60))) {
            return false;
        }

        String refreshToken = acc.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new TokenRefreshFailedException(String.valueOf(acc.getId()), "refresh token missing");
        }

        TokenRefreshResult result;
        try {
            result = refreshAccessToken(refreshToken);
        } catch (IllegalStateException ex) {
            throw new TokenRefreshFailedException(String.valueOf(acc.getId()), ex.getMessage());
        }

        Instant newExpiresAt = Instant.now().plusSeconds(result.expiresInSeconds());
        acc.updateTokens(result.accessToken(), null, newExpiresAt, acc.getScopes());

        connectedAccountService.save(acc);
        return true;
    }

    private Map<String, Object> exchangeCodeForTokens(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(TOKEN_URL, HttpMethod.POST, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null || body.get("expires_in") == null) {
                throw new IllegalStateException("OAuth token exchange failed (empty/invalid response)");
            }
            return body;

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Token exchange failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(), ex);
        }
    }

    private TokenRefreshResult refreshAccessToken(String refreshToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(TOKEN_URL, HttpMethod.POST, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null || body.get("expires_in") == null) {
                throw new IllegalStateException("Token refresh failed (empty/invalid response)");
            }

            String accessToken = body.get("access_token").toString();
            long expiresIn = Long.parseLong(body.get("expires_in").toString());

            return new TokenRefreshResult(accessToken, expiresIn);

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Token refresh failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(), ex);
        }
    }

    private String fetchChannelId(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        String url = UriComponentsBuilder
                .fromHttpUrl(YT_CHANNELS_URL)
                .queryParam("part", "id")
                .queryParam("mine", "true")
                .build(true)
                .toUriString();

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("items") == null) {
                throw new IllegalStateException("Failed to fetch YouTube channel (empty response)");
            }

            Object itemsObj = body.get("items");
            if (!(itemsObj instanceof List<?> items) || items.isEmpty()) {
                throw new IllegalStateException("No YouTube channel found for this Google account");
            }

            Object firstObj = items.get(0);
            if (!(firstObj instanceof Map<?, ?> first)) {
                throw new IllegalStateException("Unexpected YouTube API response shape");
            }

            Object idObj = first.get("id");
            if (idObj == null) throw new IllegalStateException("YouTube channel id missing in response");

            return idObj.toString();

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "YouTube channel lookup failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(), ex);
        }
    }

    private record TokenRefreshResult(String accessToken, long expiresInSeconds) { }
}
