package com.LogicGraph.sociallens.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ✅ For development APIs + Swagger, disable CSRF
            .csrf(csrf -> csrf.disable())

            // ✅ Allow H2 console to render in browser
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))

            // ✅ Allow all requests (DEV ONLY)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/health",
                    "/h2-console/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/youtube/**",
                    "/users/**",
                    "/accounts/**"
                ).permitAll()
                .anyRequest().permitAll()
            )

            // optional
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
