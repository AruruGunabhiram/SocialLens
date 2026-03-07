package com.LogicGraph.sociallens.dto.creator;

import java.time.Instant;
import java.util.List;

public record RetentionDiagnosisDto(
        String videoId,
        Instant dataWindowStart,
        Instant dataWindowEnd,
        List<RetentionPointDto> points,
        List<DropEventDto> drops,
        double overallScore) {
}
