package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.Platform;

import java.time.Instant;

public class ConnectedAccountResponse {
    private Long id;
    private Platform platform;
    private String channelId;
    private Instant expiresAt;
    private String scopes;

    public ConnectedAccountResponse() {
    }

    public ConnectedAccountResponse(Long id, Platform platform, String channelId, Instant expiresAt, String scopes) {
        this.id = id;
        this.platform = platform;
        this.channelId = channelId;
        this.expiresAt = expiresAt;
        this.scopes = scopes;
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getChannelId() {
        return channelId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String getScopes() {
        return scopes;
    }
}
