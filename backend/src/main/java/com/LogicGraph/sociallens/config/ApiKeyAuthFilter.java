package com.LogicGraph.sociallens.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Guards admin-only routes with a static API key supplied via the {@code X-API-Key} header.
 *
 * <p>Protected path patterns (configured in {@link SecurityConfig}):
 * <ul>
 *   <li>{@code /api/v1/jobs/**}</li>
 *   <li>{@code /api/v1/connected-accounts/**}</li>
 *   <li>{@code /api/v1/creator/**}</li>
 * </ul>
 *
 * <p>For a protected request:
 * <ol>
 *   <li>Missing header → 401 {@code MISSING_API_KEY}</li>
 *   <li>Header present but wrong → 403 {@code INVALID_API_KEY}</li>
 *   <li>Header matches configured key → sets a {@link PreAuthenticatedAuthenticationToken}
 *       in the {@link SecurityContextHolder} so Spring Security sees the request as
 *       authenticated, then continues the filter chain.</li>
 * </ol>
 *
 * <p>Unprotected routes pass through without any key check.
 *
 * <p>This filter is registered only in the Spring Security filter chain.
 * The {@link SecurityConfig#apiKeyFilterRegistration} bean prevents the Servlet
 * container from also registering it, which would cause double-execution.
 */
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    static final String API_KEY_HEADER = "X-API-Key";

    static final List<String> PROTECTED_PATTERNS = List.of(
            "/api/v1/jobs/**",
            "/api/v1/connected-accounts/**",
            "/api/v1/creator/**"
    );

    /**
     * Paths that match a PROTECTED_PATTERN but must be accessible without an API key.
     * These are user-initiated actions, not admin operations.
     * <ul>
     *   <li>{@code /api/v1/connected-accounts/status} — read-only account connection check</li>
     *   <li>{@code /api/v1/jobs/refresh/channel} — per-channel refresh triggered from the UI</li>
     * </ul>
     */
    static final List<String> BYPASS_PATTERNS = List.of(
            "/api/v1/connected-accounts/status",
            "/api/v1/jobs/refresh/channel"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final ObjectMapper objectMapper;

    @Value("${sociallens.admin.api-key:}")
    private String configuredApiKey;

    public ApiKeyAuthFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (!isProtected(path) || isBypassed(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(API_KEY_HEADER);

        if (provided == null || provided.isBlank()) {
            rejectWith(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Missing X-API-Key header", "MISSING_API_KEY");
            return;
        }

        if (configuredApiKey.isBlank() || !configuredApiKey.equals(provided)) {
            rejectWith(response, HttpServletResponse.SC_FORBIDDEN,
                    "Invalid API key", "INVALID_API_KEY");
            return;
        }

        // Valid key — mark the request as authenticated for Spring Security
        var auth = new PreAuthenticatedAuthenticationToken(
                "api-key-client", "[protected]",
                List.of(new SimpleGrantedAuthority("ROLE_API_CLIENT")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        filterChain.doFilter(request, response);
    }

    private boolean isProtected(String path) {
        return PROTECTED_PATTERNS.stream().anyMatch(p -> pathMatcher.match(p, path));
    }

    private boolean isBypassed(String path) {
        return BYPASS_PATTERNS.stream().anyMatch(p -> pathMatcher.match(p, path));
    }

    private void rejectWith(HttpServletResponse response, int status,
                             String message, String code) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of(
                "message", message,
                "code", code,
                "timestamp", Instant.now().toString()
        ));
    }
}
