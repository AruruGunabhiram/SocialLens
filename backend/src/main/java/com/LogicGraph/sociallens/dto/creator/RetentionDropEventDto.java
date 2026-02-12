package com.LogicGraph.sociallens.dto.creator;

public class RetentionDropEventDto {
    private double startProgress;
    private double endProgress;
    private double dropMagnitude;
    private double slope;
    private String severity; // LOW/MEDIUM/HIGH

    public RetentionDropEventDto() {}

    public RetentionDropEventDto(double startProgress, double endProgress, double dropMagnitude, double slope, String severity) {
        this.startProgress = startProgress;
        this.endProgress = endProgress;
        this.dropMagnitude = dropMagnitude;
        this.slope = slope;
        this.severity = severity;
    }

    public double getStartProgress() { return startProgress; }
    public double getEndProgress() { return endProgress; }
    public double getDropMagnitude() { return dropMagnitude; }
    public double getSlope() { return slope; }
    public String getSeverity() { return severity; }
}
