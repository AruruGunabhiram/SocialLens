package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthCallbackResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.entity.OAuthState;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.repository.OAuthStateRepository;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class YouTubeOAuthService {

    private final OAuthStateRepository oAuthStateRepository;
    private final ConnectedAccountService connectedAccountService;

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    @Value("${google.oauth.redirect-uri}")
    private String redirectUri;

    private static final String AUTH_URL =
            "https://accounts.google.com/o/oauth2/v2/auth";

    private static final String TOKEN_URL =
            "https://oauth2.googleapis.com/token";

    private static final String SCOPE =
            "https://www.googleapis.com/auth/yt-analytics.readonly";

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

        String authUrl = AUTH_URL
                + "?client_id=" + clientId
                + "&redirect_uri=" + redirectUri
                + "&response_type=code"
                + "&scope=" + SCOPE
                + "&access_type=offline"
                + "&prompt=consent"
                + "&state=" + state;

        return new OAuthStartResponse(authUrl);
    }

    public OAuthCallbackResponse handleCallback(String code, String state) {
        OAuthState savedState = oAuthStateRepository.findByState(state)
                .orElseThrow(() -> new IllegalStateException("Invalid OAuth state"));

        if (savedState.isUsed() || savedState.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("OAuth state expired or already used");
        }

        RestTemplate restTemplate = new RestTemplate();

        @SuppressWarnings("unchecked")
        Map<String, Object> tokenResponse = restTemplate.postForObject(
                TOKEN_URL,
                Map.of(
                        "code", code,
                        "client_id", clientId,
                        "client_secret", clientSecret,
                        "redirect_uri", redirectUri,
                        "grant_type", "authorization_code"
                ),
                Map.class
        );

        if (tokenResponse == null
                || tokenResponse.get("access_token") == null
                || tokenResponse.get("expires_in") == null) {
            throw new IllegalStateException("OAuth token exchange failed");
        }

        String accessToken = tokenResponse.get("access_token").toString();
        String refreshToken = tokenResponse.get("refresh_token") == null
                ? null
                : tokenResponse.get("refresh_token").toString();

        long expiresIn = Long.parseLong(tokenResponse.get("expires_in").toString());
        Instant expiresAt = Instant.now().plusSeconds(expiresIn);

        // TEMP placeholder — next step we fetch real channelId via YouTube Data API
        String channelId = "TODO_FETCH_CHANNEL_ID";

        ConnectAccountRequest req = new ConnectAccountRequest();
        req.setPlatform(Platform.YOUTUBE);
        req.setChannelId(channelId);
        req.setAccessToken(accessToken);
        req.setRefreshToken(refreshToken);
        req.setExpiresAt(expiresAt);
        req.setScopes(SCOPE);

        ConnectedAccountResponse saved =
                connectedAccountService.upsertConnection(savedState.getUserId(), req);

        savedState.setUsed(true);
        oAuthStateRepository.save(savedState);

        return new OAuthCallbackResponse(true, "Connected: " + saved.getChannelId());
    }
}
