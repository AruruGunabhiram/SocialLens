package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.Platform;

public class ConnectAccountRequest {

    private Platform platform;
    private String externalAccountId;
    private Long userId;

    public Platform getPlatform() {
        return platform;
    }

    public String getExternalAccountId() {
        return externalAccountId;
    }

    public Long getUserId() {
        return userId;
    }
}
