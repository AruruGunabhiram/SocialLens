package com.LogicGraph.sociallens.dto.creator;

public record DropEventDto(
        int atSecond,
        double dropPercent,
        String label,
        String suggestedAction) {
}
