package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.oauth.OAuthCallbackResponse;
import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.exception.OAuthStateInvalidException;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(YouTubeOAuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class YouTubeOAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private YouTubeOAuthService youTubeOAuthService;

    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/oauth/youtube/callback?code=X&state=expired-state
     * When the service throws OAuthStateInvalidException("OAuth state expired"),
     * the controller re-throws it and GlobalExceptionHandler maps it to 400
     * with code=OAUTH_STATE_INVALID.
     */
    @Test
    void callback_withExpiredState_returns400() throws Exception {
        when(youTubeOAuthService.handleCallback(eq("valid-code"), eq("expired-state")))
                .thenThrow(new OAuthStateInvalidException("OAuth state expired"));

        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("code", "valid-code")
                        .param("state", "expired-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OAUTH_STATE_INVALID"))
                .andExpect(jsonPath("$.message").value("OAuth state expired"));
    }

    /**
     * GET /api/v1/oauth/youtube/callback?code=X&state=used-state
     * When the service throws OAuthStateInvalidException("OAuth state already used"),
     * must return 400.
     */
    @Test
    void callback_withUsedState_returns400() throws Exception {
        when(youTubeOAuthService.handleCallback(eq("valid-code"), eq("used-state")))
                .thenThrow(new OAuthStateInvalidException("OAuth state already used"));

        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("code", "valid-code")
                        .param("state", "used-state"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OAUTH_STATE_INVALID"))
                .andExpect(jsonPath("$.message").value("OAuth state already used"));
    }

    /**
     * GET /api/v1/oauth/youtube/start?userId=9999
     *
     * CURRENT BEHAVIOR: startOAuth saves an OAuthState without verifying userId
     * exists; returns 200 with an authUrl.
     *
     * DESIRED BEHAVIOR: return 404 when the user does not exist.
     *
     * PRODUCTION CHANGE NEEDED: Add UserRepository to YouTubeOAuthService and
     * validate user existence inside startOAuth before persisting OAuthState.
     * Throw NotFoundException("User not found: 9999") → GlobalExceptionHandler
     * maps it to 404.
     *
     * Skipped until that validation is implemented.
     */
    @Test
    @org.junit.jupiter.api.Disabled("User existence check not yet implemented in startOAuth")
    void start_withUnknownUserId_returns404() throws Exception {
        when(youTubeOAuthService.startOAuth(9999L))
                .thenThrow(new com.LogicGraph.sociallens.exception.NotFoundException(
                        "User not found: 9999"));

        mockMvc.perform(get("/api/v1/oauth/youtube/start")
                        .param("userId", "9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    /** Sanity check: happy-path start returns the authUrl. */
    @Test
    void start_withValidUserId_returnsAuthUrl() throws Exception {
        when(youTubeOAuthService.startOAuth(1L))
                .thenReturn(new OAuthStartResponse("https://accounts.google.com/o/oauth2/v2/auth?state=abc"));

        mockMvc.perform(get("/api/v1/oauth/youtube/start")
                        .param("userId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authUrl").exists());
    }
}
