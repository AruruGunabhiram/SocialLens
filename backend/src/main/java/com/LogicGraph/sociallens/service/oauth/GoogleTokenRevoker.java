package com.LogicGraph.sociallens.service.oauth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

/**
 * Calls Google's OAuth 2.0 token revocation endpoint on user disconnect.
 *
 * <p>Design rules:
 * <ul>
 *   <li>Never throws — revocation failure must not block the local disconnect flow.</li>
 *   <li>Never logs token values — logs only status codes and sanitised messages.</li>
 *   <li>Prefers the refresh token when available; falls back to the access token.</li>
 * </ul>
 */
@Service
public class GoogleTokenRevoker {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenRevoker.class);

    /** Google OAuth 2.0 token revocation endpoint. */
    static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";

    private final RestTemplate restTemplate;

    public GoogleTokenRevoker(@Qualifier("oauthRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Revokes {@code token} at Google's revoke endpoint.
     *
     * <p>This method is intentionally "quiet":
     * <ul>
     *   <li>If {@code token} is null or blank, the call is skipped.</li>
     *   <li>If the HTTP call fails for any reason (network error, token already
     *       expired/revoked, Google 4xx/5xx), the exception is caught and logged
     *       without exposing the token value. The caller's flow continues normally.</li>
     * </ul>
     *
     * @param token the refresh token to revoke; falls back to the access token if
     *              the caller passes the access token instead.
     */
    public void revokeQuietly(String token) {
        if (token == null || token.isBlank()) {
            log.debug("revokeQuietly: no token supplied — skipping revocation");
            return;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("token", token);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);

        try {
            restTemplate.exchange(REVOKE_URL, HttpMethod.POST, request, Void.class);
            log.info("Google token revocation succeeded");

        } catch (RestClientResponseException ex) {
            // 400 "token_revoked" or "invalid_token" — token is already unusable; safe to ignore.
            log.warn("Google token revocation returned HTTP {} — treating as non-fatal: {}",
                    ex.getRawStatusCode(), ex.getStatusText());

        } catch (Exception ex) {
            // Network timeout, DNS failure, unexpected runtime error.
            log.warn("Google token revocation failed due to {}: {} — continuing with local disconnect",
                    ex.getClass().getSimpleName(), ex.getMessage());
        }
    }
}
