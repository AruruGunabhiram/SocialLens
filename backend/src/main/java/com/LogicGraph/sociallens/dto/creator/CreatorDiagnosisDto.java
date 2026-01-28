package com.LogicGraph.sociallens.dto.creator;

public class CreatorDiagnosisDto {
    private String label;
    private String severity;
    private String evidence;
    private String recommendation;

    public CreatorDiagnosisDto() {}

    public CreatorDiagnosisDto(String label, String severity, String evidence, String recommendation) {
        this.label = label;
        this.severity = severity;
        this.evidence = evidence;
        this.recommendation = recommendation;
    }

    public String getLabel() { return label; }
    public String getSeverity() { return severity; }
    public String getEvidence() { return evidence; }
    public String getRecommendation() { return recommendation; }
}
