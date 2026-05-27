package com.LogicGraph.sociallens.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link ApiKeyAuthFilter}.
 *
 * <p>Verifies that:
 * <ul>
 *   <li>All protected endpoints return 401 when the {@code X-API-Key} header is absent.</li>
 *   <li>All protected endpoints return 403 when the key is present but wrong.</li>
 *   <li>All protected endpoints let the request through when the key is correct.</li>
 *   <li>Bypass paths and public paths are never intercepted.</li>
 * </ul>
 *
 * <p>These tests run without a Spring context and are therefore fast and reliable.
 */
class ApiKeyAuthFilterTest {

    private static final String VALID_KEY = "test-admin-secret";
    private static final String WRONG_KEY  = "not-the-right-key";

    private ApiKeyAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new ApiKeyAuthFilter(new ObjectMapper());
        ReflectionTestUtils.setField(filter, "configuredApiKey", VALID_KEY);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/admin/** — newly protected; was completely unguarded before
    // -------------------------------------------------------------------------

    @Test
    void adminClear_noKey_returns401() throws Exception {
        MockHttpServletResponse response = doFilter("POST", "/api/v1/admin/data/clear", null);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("MISSING_API_KEY");
    }

    @Test
    void adminClear_wrongKey_returns403() throws Exception {
        MockHttpServletResponse response = doFilter("POST", "/api/v1/admin/data/clear", WRONG_KEY);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_API_KEY");
    }

    @Test
    void adminClear_validKey_passesThrough() throws Exception {
        MockHttpServletResponse response = doFilter("POST", "/api/v1/admin/data/clear", VALID_KEY);

        // Filter chain continues — default MockHttpServletResponse status is 200
        assertThat(response.getStatus()).isEqualTo(200);
    }

    // -------------------------------------------------------------------------
    // /api/v1/youtube/** — all YouTube endpoints require the API key
    // Previously only POST /sync was protected; GET /channel/* was accidentally public.
    // -------------------------------------------------------------------------

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/youtube/sync",
            "/api/v1/youtube/channel/@mkbhd",
            "/api/v1/youtube/channel",
            "/api/v1/youtube/channel/UCxxxxxxx"
    })
    void youtubeEndpoints_noKey_returns401(String path) throws Exception {
        MockHttpServletResponse response = doFilter("POST", path, null);

        assertThat(response.getStatus())
                .as("Expected 401 for unauthenticated request to %s", path)
                .isEqualTo(401);
        assertThat(response.getContentAsString()).contains("MISSING_API_KEY");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/youtube/sync",
            "/api/v1/youtube/channel/@mkbhd",
            "/api/v1/youtube/channel"
    })
    void youtubeEndpoints_wrongKey_returns403(String path) throws Exception {
        MockHttpServletResponse response = doFilter("GET", path, WRONG_KEY);

        assertThat(response.getStatus())
                .as("Expected 403 for wrong-key request to %s", path)
                .isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_API_KEY");
    }

    @Test
    void youtubeSync_validKey_passesThrough() throws Exception {
        MockHttpServletResponse response = doFilter("POST", "/api/v1/youtube/sync", VALID_KEY);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void youtubeChannelLookup_validKey_passesThrough() throws Exception {
        MockHttpServletResponse response = doFilter("GET", "/api/v1/youtube/channel/@mkbhd", VALID_KEY);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    // -------------------------------------------------------------------------
    // Previously-protected routes — regression: must still be guarded
    // -------------------------------------------------------------------------

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/jobs/daily-refresh/run",
            "/api/v1/jobs/any-path",
            "/api/v1/connected-accounts/list",
            "/api/v1/creator/summary"
    })
    void existingProtectedRoutes_noKey_returns401(String path) throws Exception {
        MockHttpServletResponse response = doFilter("POST", path, null);

        assertThat(response.getStatus())
                .as("Expected 401 for unkeyed request to %s", path)
                .isEqualTo(401);
    }

    // -------------------------------------------------------------------------
    // Bypass paths — must remain accessible without a key
    // -------------------------------------------------------------------------

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/connected-accounts/status",
            "/api/v1/jobs/refresh/channel"
    })
    void bypassPaths_noKey_passThrough(String path) throws Exception {
        MockHttpServletResponse response = doFilter("POST", path, null);

        // Filter should not intercept these — default response status is 200
        assertThat(response.getStatus())
                .as("Expected bypass (200) for path %s", path)
                .isEqualTo(200);
    }

    // -------------------------------------------------------------------------
    // Public paths — completely outside protected patterns
    // -------------------------------------------------------------------------

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/youtube/channel/@mkbhd",
            "/api/v1/youtube/channel",
            "/api/v1/analytics/overview",
            "/api/v1/channels",
            "/actuator/health"
    })
    void publicPaths_noKey_passThrough(String path) throws Exception {
        MockHttpServletResponse response = doFilter("GET", path, null);

        assertThat(response.getStatus())
                .as("Expected public access (200) for path %s", path)
                .isEqualTo(200);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Runs the filter for a single synthetic request.
     *
     * @param method   HTTP method (GET, POST, …)
     * @param uri      request URI
     * @param apiKey   value for the {@code X-API-Key} header, or {@code null} to omit it
     * @return the response after the filter (and mock filter chain) have run
     */
    private MockHttpServletResponse doFilter(String method, String uri, String apiKey)
            throws Exception {
        MockHttpServletRequest  request  = new MockHttpServletRequest(method, uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        if (apiKey != null) {
            request.addHeader(ApiKeyAuthFilter.API_KEY_HEADER, apiKey);
        }

        filter.doFilterInternal(request, response, chain);
        return response;
    }
}
