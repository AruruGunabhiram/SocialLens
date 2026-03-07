package com.LogicGraph.sociallens.dto.jobs;

import java.time.Instant;

public record JobStatusDto(
        String jobName,
        Instant lastRunAt,
        String lastStatus,
        Instant nextScheduledAt,
        int itemsProcessed,
        int apiCallsUsed) {
}
