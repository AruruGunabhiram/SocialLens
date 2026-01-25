package com.LogicGraph.sociallens.dto.oauth;

public class OAuthCallbackResponse {
    public boolean connected;
    public String message;

    public OAuthCallbackResponse() {
    }

    public OAuthCallbackResponse(boolean connected, String message) {
        this.connected = connected;
        this.message = message;
    }
}
