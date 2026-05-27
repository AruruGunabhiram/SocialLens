package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.exception.OAuthStateInvalidException;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/v1/oauth/youtube")
@RequiredArgsConstructor
public class YouTubeOAuthController {

    /**
     * Generic safe message sent to the frontend on any OAuth failure.
     * Never expose raw exception messages or Google error codes here —
     * those are logged server-side only.
     */
    static final String SAFE_ERROR_MESSAGE = "OAuth connection failed. Please try again.";

    private final YouTubeOAuthService youTubeOAuthService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Step 1: Start OAuth flow.
     * Returns { authUrl } for the frontend to open in a new tab.
     */
    @GetMapping("/start")
    public OAuthStartResponse startOAuth(@RequestParam Long userId) {
        return youTubeOAuthService.startOAuth(userId);
    }

    /**
     * Step 2: Google redirects the user's browser here after consent.
     * We exchange the code, store tokens, then redirect the browser to the
     * frontend callback page so the user sees a real UI instead of raw JSON.
     *
     * Frontend landing: {frontendUrl}/oauth/callback?connected=true|false[&message=...]
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription) {

        log.info("YT CALLBACK HIT: codePresent={}, state={}, error={}, error_description={}",
                code != null, state, error, errorDescription);

        if (error != null) {
            // Raw Google error codes are already captured in the log line above.
            // Do NOT forward them to the frontend URL \u2014 they can expose internal detail.
            return redirectToFrontend(false, SAFE_ERROR_MESSAGE);
        }

        if (code == null || state == null) {
            return redirectToFrontend(false, "Missing code or state from Google callback");
        }

        try {
            youTubeOAuthService.handleCallback(code, state);
            return redirectToFrontend(true, null);
        } catch (OAuthStateInvalidException e) {
            log.warn("OAuth state validation failed. state={} reason={}", state, e.getMessage());
            return redirectToFrontend(false, SAFE_ERROR_MESSAGE);
        } catch (Exception e) {
            log.error("OAuth callback failed. state={}, codePresent=true", state, e);
            return redirectToFrontend(false, SAFE_ERROR_MESSAGE);
        }
    }

    private ResponseEntity<Void> redirectToFrontend(boolean connected, String message) {
        StringBuilder url = new StringBuilder(frontendUrl)
                .append("/oauth/callback?connected=")
                .append(connected);
        if (message != null) {
            url.append("&message=")
               .append(URLEncoder.encode(message, StandardCharsets.UTF_8));
        }
        return ResponseEntity.status(302)
                .location(URI.create(url.toString()))
                .build();
    }
}
