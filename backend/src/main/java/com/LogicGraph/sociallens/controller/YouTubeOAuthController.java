package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.oauth.OAuthCallbackResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/oauth/youtube")
@RequiredArgsConstructor
public class YouTubeOAuthController {

    private final YouTubeOAuthService youTubeOAuthService;

    
    /**
     * Step 1: Start OAuth flow
     * Frontend redirects user to returned URL
     */
    @GetMapping("/start")
    public OAuthStartResponse startOAuth(@RequestParam Long userId) {
        return youTubeOAuthService.startOAuth(userId);
    }

    /**
     * Step 2: OAuth callback from Google
     */
    @GetMapping("/callback")
    public ResponseEntity<?> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription) {

        log.info("YT CALLBACK HIT: codePresent={}, state={}, error={}, error_description={}",
                code != null, state, error, errorDescription);

        if (error != null) {
            return ResponseEntity.badRequest().body(
                    new OAuthCallbackResponse(false, "Google OAuth error: " + error + " " + errorDescription));
        }

        if (code == null || state == null) {
            return ResponseEntity.badRequest().body(
                    new OAuthCallbackResponse(false, "Missing code or state from Google callback"));
        }

        try {
            OAuthCallbackResponse response = youTubeOAuthService.handleCallback(code, state);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("OAuth callback failed. state={}, codePresent={}", state, true, e);
            return ResponseEntity.status(500).body(
                    new OAuthCallbackResponse(false, "OAuth callback failed: " + e.getMessage()));
        }
    }
}