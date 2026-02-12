package com.LogicGraph.sociallens.dto.oauth;

public class OAuthStartResponse {
    public String authUrl;

    public OAuthStartResponse() {
    }

    public OAuthStartResponse(String authUrl) {
        this.authUrl = authUrl;
    }
}
