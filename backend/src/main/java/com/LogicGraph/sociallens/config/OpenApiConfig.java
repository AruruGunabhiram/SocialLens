package com.LogicGraph.sociallens.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Bean
    public OpenAPI socialLensOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SocialLens API")
                        .version("1.0.0"))
                .addServersItem(new Server().url(baseUrl).description("Default server"))
                .addTagsItem(new Tag()
                        .name("Explorer")
                        .description("Public channel analytics  -  no auth required"))
                .addTagsItem(new Tag()
                        .name("Studio")
                        .description("OAuth-privileged creator analytics  -  requires connected account"));
    }
}
