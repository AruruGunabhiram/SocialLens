package com.LogicGraph.sociallens.dto.analytics;

import java.time.LocalDate;

public record TimeSeriesPointDto(LocalDate date, long value) {
}
