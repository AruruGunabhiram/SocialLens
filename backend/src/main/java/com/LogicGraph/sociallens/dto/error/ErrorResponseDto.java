package com.LogicGraph.sociallens.dto.error;

import java.time.Instant;

public record ErrorResponseDto(String error, String code, Instant timestamp) {
}
