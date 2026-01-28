package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthCallbackResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.OAuthState;
import com.LogicGraph.sociallens.enums.Platform;
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
        os.setExpiresAt(Instant.now().plusSeconds(600)); // 10 min
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
                .orElseThrow(() -> new IllegalStateException("Invalid OAuth state"));

        if (savedState.isUsed()) throw new IllegalStateException("OAuth state already used");
        if (savedState.getExpiresAt().isBefore(Instant.now())) throw new IllegalStateException("OAuth state expired");

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

        ConnectedAccountResponse saved =
                connectedAccountService.upsertConnection(savedState.getUserId(), req);

        savedState.setUsed(true);
        oAuthStateRepository.save(savedState);

        return new OAuthCallbackResponse(true, "Connected: " + saved.getChannelId());
    }

    /**
     * Returns an access token valid "now".
     * If refreshed, this method persists the updated tokens.
     */
    public String getValidAccessToken(ConnectedAccount account) {
        if (account == null) throw new IllegalArgumentException("ConnectedAccount is null");

        String accessToken = account.getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("Missing access token for connected account id=" + account.getId());
        }

        Instant expiresAt = account.getExpiresAt();
        if (expiresAt == null) return accessToken; // best-effort

        boolean expiredOrNear = Instant.now().isAfter(expiresAt.minusSeconds(60));
        if (!expiredOrNear) return accessToken;

        String refreshToken = account.getRefreshToken();
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("Access token expired and refresh token missing for account id=" + account.getId());
        }

        TokenRefreshResult refreshed = refreshAccessToken(refreshToken);

        Instant newExpiresAt = Instant.now().plusSeconds(refreshed.expiresInSeconds());
        account.updateTokens(refreshed.accessToken(), null, newExpiresAt, account.getScopes());

        // ✅ CRITICAL: persist refreshed tokens
        connectedAccountService.save(account);

        return account.getAccessToken();
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
            ResponseEntity<Map> response = restTemplate.exchange(
                    TOKEN_URL, HttpMethod.POST, request, Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null || body.get("expires_in") == null) {
                throw new IllegalStateException("OAuth token exchange failed (empty/invalid response)");
            }
            return body;

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Token exchange failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
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
            ResponseEntity<Map> response = restTemplate.exchange(
                    TOKEN_URL, HttpMethod.POST, request, Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null || body.get("expires_in") == null) {
                throw new IllegalStateException("Token refresh failed (empty/invalid response)");
            }

            String accessToken = body.get("access_token").toString();
            long expiresIn = Long.parseLong(body.get("expires_in").toString());

            return new TokenRefreshResult(accessToken, expiresIn);

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Token refresh failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
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
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, request, Map.class
            );

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
            if (idObj == null) {
                throw new IllegalStateException("YouTube channel id missing in response");
            }

            return idObj.toString();

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "YouTube channel lookup failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
        }
    }

    private record TokenRefreshResult(String accessToken, long expiresInSeconds) {}
}
