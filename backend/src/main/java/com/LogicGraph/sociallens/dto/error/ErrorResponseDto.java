package com.LogicGraph.sociallens.dto.error;

import java.time.Instant;
import java.util.Map;

public record ErrorResponseDto(
        String message,
        String code,
        Instant timestamp,
        Map<String, Object> details
) {
    public ErrorResponseDto(String message, String code, Instant timestamp) {
        this(message, code, timestamp, null);
    }
}
