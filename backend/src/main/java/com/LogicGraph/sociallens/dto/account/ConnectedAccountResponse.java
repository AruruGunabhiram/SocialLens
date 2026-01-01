package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.Platform;

public class ConnectedAccountResponse {

    private Long id;
    private Platform platform;
    private String externalAccountId;

    public ConnectedAccountResponse(Long id, Platform platform, String externalAccountId) {
        this.id = id;
        this.platform = platform;
        this.externalAccountId = externalAccountId;
    }

    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getExternalAccountId() {
        return externalAccountId;
    }
}
