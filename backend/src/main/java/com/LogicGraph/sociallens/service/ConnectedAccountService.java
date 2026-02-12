package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

@Service
public class ConnectedAccountService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final UserRepository userRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";

    public ConnectedAccountService(
            ConnectedAccountRepository connectedAccountRepository,
            UserRepository userRepository) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.userRepository = userRepository;
    }

    /**
     * Creates or updates the user's connection for a platform.
     * NOTE: refreshToken is optional; never overwrite an existing refresh token
     * with null/blank.
     */
    @Transactional
    public ConnectedAccountResponse upsertConnection(Long userId, ConnectAccountRequest request) {
        if (request.getPlatform() == null)
            throw new IllegalArgumentException("platform is required");
        if (request.getChannelId() == null || request.getChannelId().isBlank())
            throw new IllegalArgumentException("channelId is required");
        if (request.getAccessToken() == null || request.getAccessToken().isBlank())
            throw new IllegalArgumentException("accessToken is required");
        if (request.getExpiresAt() == null)
            throw new IllegalArgumentException("expiresAt is required");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));

        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, request.getPlatform())
                .orElse(null);

        if (account == null) {
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

        // Update in place (never wipe refresh token)
        account.setChannelId(request.getChannelId());
        account.setAccessToken(request.getAccessToken());
        account.setExpiresAt(request.getExpiresAt());
        account.setScopes(request.getScopes());

        if (request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            account.setRefreshToken(request.getRefreshToken());
        }

        ConnectedAccount saved = connectedAccountRepository.save(account);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public boolean isConnected(Long userId, Platform platform) {
        return connectedAccountRepository
                .findByUser_IdAndPlatform(userId, platform)
                .isPresent();

    }

    @Transactional
    public ConnectedAccount save(ConnectedAccount account) {
        return connectedAccountRepository.save(account);
    }

    /**
     * Returns an access token that is valid (refreshes if needed).
     * Use this BEFORE calling YouTube Data API / YouTube Analytics API.
     */
    @Transactional
    public String getValidAccessToken(Long userId, Platform platform) {
        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, platform)
                .orElseThrow(() -> new IllegalStateException("No connected account for " + platform));

        // If expires in more than 60 seconds, it’s safe
        Instant expiresAt = account.getExpiresAt();
        if (expiresAt != null && expiresAt.isAfter(Instant.now().plusSeconds(60))) {
            return account.getAccessToken();
        }

        // Need refresh
        if (account.getRefreshToken() == null || account.getRefreshToken().isBlank()) {
            throw new IllegalStateException(
                    "Access token expired and no refresh token available. Reconnect OAuth.");
        }

        return refreshAndPersistAccessToken(account);
    }

    /**
     * Refresh access token using refresh_token grant, update DB, return new token.
     * Google expects application/x-www-form-urlencoded.
     */
    private String refreshAndPersistAccessToken(ConnectedAccount account) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException("Missing google.oauth.client-id / google.oauth.client-secret");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", account.getRefreshToken());
        form.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.exchange(
                    TOKEN_URL,
                    HttpMethod.POST,
                    request,
                    Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || body.get("access_token") == null || body.get("expires_in") == null) {
                throw new IllegalStateException("Failed to refresh access token (unexpected response)");
            }

            String newAccessToken = body.get("access_token").toString();
            long expiresIn = Long.parseLong(body.get("expires_in").toString());
            Instant newExpiry = Instant.now().plusSeconds(expiresIn);

            // Persist new access token + expiry; DO NOT touch refresh token here
            account.setAccessToken(newAccessToken);
            account.setExpiresAt(newExpiry);

            connectedAccountRepository.save(account);
            return newAccessToken;

        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Token refresh failed: HTTP " + ex.getRawStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex);
        }
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
