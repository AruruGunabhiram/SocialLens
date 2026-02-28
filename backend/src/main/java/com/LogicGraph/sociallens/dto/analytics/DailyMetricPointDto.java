package com.LogicGraph.sociallens.dto.analytics;

/**
 * A single normalized data point for the timeseries chart.
 * One point per calendar day; value is the metric selected by the caller.
 */
public class DailyMetricPointDto {

    public String date;  // YYYY-MM-DD
    public Long value;

    public DailyMetricPointDto() {}

    public DailyMetricPointDto(String date, Long value) {
        this.date = date;
        this.value = value;
    }
}
