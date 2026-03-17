package com.LogicGraph.sociallens.dto.account;

import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;

public record ConnectResultDto(
        Long accountId,
        Platform platform,
        String channelId,
        ConnectedAccountStatus status) {
}
