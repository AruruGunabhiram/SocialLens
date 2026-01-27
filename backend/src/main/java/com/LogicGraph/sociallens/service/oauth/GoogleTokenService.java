package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Service
public class GoogleTokenService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.oauth.client-id}")
    private String clientId;

    @Value("${google.oauth.client-secret}")
    private String clientSecret;

    public GoogleTokenService(ConnectedAccountRepository connectedAccountRepository) {
        this.connectedAccountRepository = connectedAccountRepository;
    }

    public ConnectedAccount getYouTubeAccount(Long userId) {
        return connectedAccountRepository
                .findByUserIdAndPlatform(userId, com.LogicGraph.sociallens.enums.Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException("No YouTube connected account for userId=" + userId));
    }

    /**
     * Returns a valid access token for userId+platform=YOUTUBE. Refreshes if
     * expiring.
     */
    public String getValidAccessToken(Long userId) {
        ConnectedAccount acc = connectedAccountRepository
                .findByUserIdAndPlatform(userId, com.LogicGraph.sociallens.enums.Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException("No YouTube connected account for userId=" + userId));

        // Refresh if token expires within next 60 seconds
        if (acc.getExpiresAt() == null || acc.getExpiresAt().isBefore(Instant.now().plusSeconds(60))) {
            refreshAccessToken(acc);
        }

        return acc.getAccessToken();
    }

    private void refreshAccessToken(ConnectedAccount acc) {
        if (acc.getRefreshToken() == null || acc.getRefreshToken().isBlank()) {
            throw new IllegalStateException("Missing refresh_token (need prompt=consent & access_type=offline)");
        }

        String tokenUrl = "https://oauth2.googleapis.com/token";

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", acc.getRefreshToken());
        form.add("grant_type", "refresh_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map> res = restTemplate.exchange(
                tokenUrl,
                HttpMethod.POST,
                new HttpEntity<>(form, headers),
                Map.class);

        Map body = res.getBody();
        if (body == null || body.get("access_token") == null) {
            throw new IllegalStateException("Refresh failed: empty response");
        }

        String newAccessToken = (String) body.get("access_token");
        Integer expiresIn = body.get("expires_in") instanceof Number ? ((Number) body.get("expires_in")).intValue()
                : 3600;

        acc.setAccessToken(newAccessToken);
        acc.setExpiresAt(Instant.now().plus(Duration.ofSeconds(expiresIn)));

        connectedAccountRepository.save(acc);
    }
}
