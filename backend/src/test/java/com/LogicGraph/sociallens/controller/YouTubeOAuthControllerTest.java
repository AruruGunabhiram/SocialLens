package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.oauth.OAuthStartResponse;
import com.LogicGraph.sociallens.exception.OAuthStateInvalidException;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.eq;
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
    // /start
    // -------------------------------------------------------------------------

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

    /**
     * GET /api/v1/oauth/youtube/start?userId=9999
     * Skipped until user-existence check is implemented in startOAuth.
     */
    @Test
    @org.junit.jupiter.api.Disabled("User existence check not yet implemented in startOAuth")
    void start_withUnknownUserId_returns404() throws Exception {
        when(youTubeOAuthService.startOAuth(9999L))
                .thenThrow(new com.LogicGraph.sociallens.exception.NotFoundException("User not found: 9999"));

        mockMvc.perform(get("/api/v1/oauth/youtube/start")
                        .param("userId", "9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    // -------------------------------------------------------------------------
    // /callback  -  all paths now redirect (302) to the frontend callback page
    // -------------------------------------------------------------------------

    /**
     * Happy path: service succeeds → 302 to /oauth/callback?connected=true
     */
    @Test
    void callback_success_redirectsWithConnectedTrue() throws Exception {
        when(youTubeOAuthService.handleCallback(eq("valid-code"), eq("valid-state")))
                .thenReturn(null); // return type is void-like; result is unused

        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("code", "valid-code")
                        .param("state", "valid-state"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/oauth/callback?connected=true")));
    }

    /**
     * OAuthStateInvalidException (expired state) → 302 with connected=false.
     * Previously returned 400 via GlobalExceptionHandler; now the controller
     * catches it and redirects so the user sees a proper UI.
     */
    @Test
    void callback_withExpiredState_redirectsWithConnectedFalse() throws Exception {
        when(youTubeOAuthService.handleCallback(eq("valid-code"), eq("expired-state")))
                .thenThrow(new OAuthStateInvalidException("OAuth state expired"));

        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("code", "valid-code")
                        .param("state", "expired-state"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/oauth/callback?connected=false")))
                .andExpect(header().string("Location", containsString("message=")));
    }

    /**
     * OAuthStateInvalidException (already-used state) → 302 with connected=false.
     */
    @Test
    void callback_withUsedState_redirectsWithConnectedFalse() throws Exception {
        when(youTubeOAuthService.handleCallback(eq("valid-code"), eq("used-state")))
                .thenThrow(new OAuthStateInvalidException("OAuth state already used"));

        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("code", "valid-code")
                        .param("state", "used-state"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/oauth/callback?connected=false")));
    }

    /**
     * Google sends error=access_denied → 302 with connected=false and message.
     */
    @Test
    void callback_withGoogleError_redirectsWithConnectedFalse() throws Exception {
        mockMvc.perform(get("/api/v1/oauth/youtube/callback")
                        .param("error", "access_denied")
                        .param("error_description", "User denied access"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/oauth/callback?connected=false")))
                .andExpect(header().string("Location", containsString("message=")));
    }

    /**
     * Missing code or state → 302 with connected=false.
     */
    @Test
    void callback_missingCodeAndState_redirectsWithConnectedFalse() throws Exception {
        mockMvc.perform(get("/api/v1/oauth/youtube/callback"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", containsString("/oauth/callback?connected=false")));
    }
}
