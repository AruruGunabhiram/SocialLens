package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

@Service
public class ConnectedAccountService {

        private final ConnectedAccountRepository connectedAccountRepository;
        private final UserRepository userRepository;

        @Value("${google.oauth.client-id:}")
        private String clientId;

        @Value("${google.oauth.client-secret:}")
        private String clientSecret;

        private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";

        public ConnectedAccountService(
                        ConnectedAccountRepository connectedAccountRepository,
                        UserRepository userRepository) {
                this.connectedAccountRepository = connectedAccountRepository;
                this.userRepository = userRepository;
        }

        /**
         * OAuth callback should call this after exchanging code -> tokens and fetching
         * channelId.
         * Creates or updates the user's connection for a platform.
         */
        @Transactional
        public ConnectedAccountResponse upsertConnection(Long userId, ConnectAccountRequest request) {
                if (request.getPlatform() == null)
                        throw new IllegalArgumentException("platform is required");
                if (request.getChannelId() == null || request.getChannelId().isBlank())
                        throw new IllegalArgumentException("channelId is required");
                if (request.getAccessToken() == null || request.getAccessToken().isBlank())
                        throw new IllegalArgumentException("accessToken is required");
                // refreshToken is OPTIONAL (Google may not return it every time)
                if (request.getExpiresAt() == null)
                        throw new IllegalArgumentException("expiresAt is required");

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));

                ConnectedAccount account = connectedAccountRepository
                                .findByUser_IdAndPlatform(userId, request.getPlatform())
                                .orElse(null);

                if (account == null) {
                        // Create new
                        ConnectedAccount created = new ConnectedAccount(
                                        request.getPlatform(),
                                        request.getChannelId(),
                                        request.getAccessToken(),
                                        request.getRefreshToken(), // may be null
                                        request.getExpiresAt(),
                                        request.getScopes(),
                                        user);

                        ConnectedAccount saved = connectedAccountRepository.save(created);
                        return toResponse(saved);
                }

                // Update in place
                account.setChannelId(request.getChannelId());
                account.updateTokens(
                                request.getAccessToken(),
                                request.getRefreshToken(), // only overwrites if non-empty
                                request.getExpiresAt(),
                                request.getScopes());

                ConnectedAccount saved = connectedAccountRepository.save(account);
                return toResponse(saved);
        }

        @Transactional(readOnly = true)
        public boolean isConnected(Long userId, Platform platform) {
                return connectedAccountRepository.existsByUser_IdAndPlatform(userId, platform);
        }

        /**
         * For any API call that requires OAuth token (YouTube Analytics, etc.)
         * this is the method you should use.
         */
        @Transactional
        public String getValidAccessToken(Long userId, Platform platform) {
                ConnectedAccount account = connectedAccountRepository
                                .findByUser_IdAndPlatform(userId, platform)
                                .orElseThrow(() -> new IllegalStateException("No connected account for " + platform));

                // If expires in more than 60 seconds, it's safe
                if (account.getExpiresAt() != null && account.getExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
                        return account.getAccessToken();
                }

                // Need refresh
                if (account.getRefreshToken() == null || account.getRefreshToken().isBlank()) {
                        throw new IllegalStateException(
                                        "Access token expired and no refresh token available. Reconnect OAuth.");
                }

                return refreshAccessToken(account);
        }

        private String refreshAccessToken(ConnectedAccount account) {
                if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
                        throw new IllegalStateException("Missing google.oauth.client-id / google.oauth.client-secret");
                }

                RestTemplate restTemplate = new RestTemplate();

                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.postForObject(
                                TOKEN_URL,
                                Map.of(
                                                "client_id", clientId,
                                                "client_secret", clientSecret,
                                                "refresh_token", account.getRefreshToken(),
                                                "grant_type", "refresh_token"),
                                Map.class);

                if (response == null || response.get("access_token") == null || response.get("expires_in") == null) {
                        throw new IllegalStateException("Failed to refresh access token (unexpected response)");
                }

                String newAccessToken = response.get("access_token").toString();
                long expiresIn = Long.parseLong(response.get("expires_in").toString());
                Instant newExpiry = Instant.now().plusSeconds(expiresIn);

                account.updateTokens(newAccessToken, null, newExpiry, account.getScopes());
                connectedAccountRepository.save(account);

                return newAccessToken;
        }

        private ConnectedAccountResponse toResponse(ConnectedAccount saved) {
                return new ConnectedAccountResponse(
                                saved.getId(),
                                saved.getPlatform(),
                                saved.getChannelId(),
                                saved.getExpiresAt(),
                                saved.getScopes());
        }
}
