package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.Platform;

import java.time.Instant;

public class ConnectAccountRequest {
    private Platform platform; // YOUTUBE
    private String channelId; // UC...
    private String accessToken;
    private String refreshToken; // can be null sometimes
    private Instant expiresAt;
    private String scopes;

    public ConnectAccountRequest() {
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getChannelId() {
        return channelId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String getScopes() {
        return scopes;
    }

    public void setPlatform(Platform platform) {
        this.platform = platform;
    }

    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public void setScopes(String scopes) {
        this.scopes = scopes;
    }
}
