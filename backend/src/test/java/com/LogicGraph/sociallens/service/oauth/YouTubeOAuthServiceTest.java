package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.OAuthState;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.TokenRefreshFailedException;
import com.LogicGraph.sociallens.repository.OAuthStateRepository;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for YouTubeOAuthService.
 *
 * RestTemplate is injected as a constructor argument, so the mock is passed
 * directly — no ReflectionTestUtils swapping required.
 * The three {@code @Value} fields (clientId, clientSecret, redirectUri) are
 * still set via ReflectionTestUtils because there is no Spring context here.
 */
@ExtendWith(MockitoExtension.class)
class YouTubeOAuthServiceTest {

    @Mock private OAuthStateRepository oAuthStateRepository;
    @Mock private ConnectedAccountService connectedAccountService;
    @Mock private RestTemplate mockRestTemplate;

    private YouTubeOAuthService service;

    @BeforeEach
    void setUp() {
        service = new YouTubeOAuthService(oAuthStateRepository, connectedAccountService, mockRestTemplate);
        ReflectionTestUtils.setField(service, "clientId", "test-client-id");
        ReflectionTestUtils.setField(service, "clientSecret", "test-client-secret");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost/callback");
    }

    // -------------------------------------------------------------------------

    /**
     * handleCallback exchanges the code for tokens, fetches the channel ID,
     * and persists the connection via connectedAccountService.upsertConnection.
     */
    @Test
    @SuppressWarnings("unchecked")
    void handleCallback_exchangesCodeAndPersistsTokens() {
        OAuthState state = validState(1L);
        when(oAuthStateRepository.findByState("state-abc")).thenReturn(Optional.of(state));

        // Token exchange response
        Map<String, Object> tokenBody = Map.of(
                "access_token", "access-token-xyz",
                "refresh_token", "refresh-token-xyz",
                "expires_in", "3600");
        when(mockRestTemplate.exchange(
                contains("oauth2.googleapis.com/token"), eq(HttpMethod.POST), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(tokenBody));

        // Channel lookup response
        Map<String, Object> channelBody = Map.of(
                "items", List.of(Map.of("id", "UC_channel123")));
        when(mockRestTemplate.exchange(
                contains("youtube/v3/channels"), eq(HttpMethod.GET), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(channelBody));

        ConnectedAccountResponse savedAccount = new ConnectedAccountResponse(
                1L, Platform.YOUTUBE, "UC_channel123", Instant.now().plusSeconds(3600), "scope");
        when(connectedAccountService.upsertConnection(eq(1L), any(ConnectAccountRequest.class)))
                .thenReturn(savedAccount);
        when(oAuthStateRepository.save(any())).thenReturn(state);

        var response = service.handleCallback("auth-code", "state-abc");

        assertThat(response.connected).isTrue();
        assertThat(response.message).contains("UC_channel123");

        // State must be marked used
        assertThat(state.isUsed()).isTrue();

        // Verify upsert was called with the correct channel and access token
        ArgumentCaptor<ConnectAccountRequest> reqCaptor =
                ArgumentCaptor.forClass(ConnectAccountRequest.class);
        verify(connectedAccountService).upsertConnection(eq(1L), reqCaptor.capture());
        ConnectAccountRequest req = reqCaptor.getValue();
        assertThat(req.getAccessToken()).isEqualTo("access-token-xyz");
        assertThat(req.getRefreshToken()).isEqualTo("refresh-token-xyz");
        assertThat(req.getChannelId()).isEqualTo("UC_channel123");
    }

    /**
     * getValidAccessToken: when the token is expired (expiresAt in the past),
     * the service must call the token refresh endpoint and update the account.
     */
    @Test
    @SuppressWarnings("unchecked")
    void getValidAccessToken_whenExpired_refreshesAndReturnsNew() {
        ConnectedAccount account = connectedAccount("old-access-token", "valid-refresh-token",
                Instant.now().minusSeconds(120)); // already expired

        Map<String, Object> refreshBody = Map.of(
                "access_token", "new-access-token",
                "expires_in", "3600");
        when(mockRestTemplate.exchange(
                contains("oauth2.googleapis.com/token"), eq(HttpMethod.POST), any(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(refreshBody));
        when(connectedAccountService.save(account)).thenReturn(account);

        String token = service.getValidAccessToken(account);

        assertThat(token).isEqualTo("new-access-token");
        verify(connectedAccountService).save(account);
    }

    /**
     * getValidAccessToken: when the refresh call fails, the service must
     * throw TokenRefreshFailedException (not a raw IllegalStateException).
     */
    @Test
    @SuppressWarnings("unchecked")
    void getValidAccessToken_refreshFails_throwsTokenRefreshFailed() {
        ConnectedAccount account = connectedAccount("old-token", "refresh-token",
                Instant.now().minusSeconds(120)); // expired

        when(mockRestTemplate.exchange(
                contains("oauth2.googleapis.com/token"), eq(HttpMethod.POST), any(), eq(Map.class)))
                .thenThrow(new org.springframework.web.client.RestClientResponseException(
                        "Token exchange failed", 401, "Unauthorized",
                        null, null, null));

        assertThatThrownBy(() -> service.getValidAccessToken(account))
                .isInstanceOf(TokenRefreshFailedException.class);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private OAuthState validState(Long userId) {
        OAuthState s = new OAuthState();
        s.setState("state-abc");
        s.setUserId(userId);
        s.setUsed(false);
        s.setExpiresAt(Instant.now().plusSeconds(600));
        return s;
    }

    private ConnectedAccount connectedAccount(String accessToken, String refreshToken,
                                               Instant expiresAt) {
        ConnectedAccount acc = new ConnectedAccount(
                Platform.YOUTUBE, "UC_test", accessToken, refreshToken, expiresAt,
                "scope", null);
        // Set id via reflection (no-arg constructor is protected, id has no public setter)
        ReflectionTestUtils.setField(acc, "id", 1L);
        return acc;
    }
}
