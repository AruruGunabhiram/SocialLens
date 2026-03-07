package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;

import java.time.Instant;

public record ConnectedAccountDto(
        Long id,
        Platform platform,
        String channelId,
        ConnectedAccountStatus status,
        Instant lastRefreshedAt,
        Instant createdAt) {
}
