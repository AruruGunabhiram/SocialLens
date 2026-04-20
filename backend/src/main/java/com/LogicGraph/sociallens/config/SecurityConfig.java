package com.LogicGraph.sociallens.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final ApiKeyAuthFilter apiKeyAuthFilter;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource,
                          ApiKeyAuthFilter apiKeyAuthFilter) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.apiKeyAuthFilter = apiKeyAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers ->
                        headers.frameOptions(frame -> frame.disable()))
                .addFilterBefore(apiKeyAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // API-key-protected admin routes  -  ApiKeyAuthFilter enforces the key
                        // and sets a PreAuthenticatedAuthenticationToken on valid requests.
                        // User-facing endpoints carved out of the admin-protected namespaces.
                        // These must be declared before the broader authenticated() rule.
                        .requestMatchers(
                                "/api/v1/connected-accounts/status",
                                "/api/v1/jobs/refresh/channel")
                            .permitAll()
                        // Admin routes protected by ApiKeyAuthFilter
                        .requestMatchers(
                                "/api/v1/jobs/**",
                                "/api/v1/connected-accounts/**",
                                "/api/v1/creator/**")
                            .authenticated()
                        // Public routes: analytics, channels, youtube ingestion, health, OAuth
                        // TODO(auth): migrate to JWT before onboarding external users.
                        .anyRequest().permitAll());

        return http.build();
    }

    /**
     * Prevents the Servlet container from registering ApiKeyAuthFilter as a plain
     * servlet filter in addition to its role in the Spring Security filter chain.
     * Without this, the filter would execute twice on every request.
     */
    @Bean
    public FilterRegistrationBean<ApiKeyAuthFilter> apiKeyFilterRegistration() {
        FilterRegistrationBean<ApiKeyAuthFilter> registration =
                new FilterRegistrationBean<>(apiKeyAuthFilter);
        registration.setEnabled(false);
        return registration;
    }
}
