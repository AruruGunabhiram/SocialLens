package com.LogicGraph.sociallens.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI socialLensOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SocialLens API")
                        .description("Backend APIs for SocialLens (YouTube/Instagram analytics)")
                        .version("0.1.0"));
    }
}
