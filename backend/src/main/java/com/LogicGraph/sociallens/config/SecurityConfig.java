package com.LogicGraph.sociallens.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
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
                .authorizeHttpRequests(auth -> auth
                        // TODO(auth): Replace with JWT filter chain before first external user.
                        // All routes are intentionally open until JWT is wired.
                        // Protected routes will be: /api/v1/yt-analytics/**, /api/v1/connected-accounts/**,
                        // /creator/**, and any route that touches user-specific OAuth tokens.
                        .anyRequest().permitAll());

        return http.build();
    }
}
