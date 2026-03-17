package com.LogicGraph.sociallens.dto.jobs;

import java.time.Instant;

public record JobTriggerResultDto(
        String jobName,
        Instant triggeredAt,
        String status) {
}
