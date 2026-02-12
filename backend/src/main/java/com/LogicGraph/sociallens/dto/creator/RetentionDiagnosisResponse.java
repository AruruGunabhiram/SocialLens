package com.LogicGraph.sociallens.dto.creator;

import java.util.List;

public class RetentionDiagnosisResponse {
    private String videoId;
    private String summary;
    private List<RetentionDropEventDto> dropEvents;
    private List<CreatorDiagnosisDto> diagnoses;

    public RetentionDiagnosisResponse() {}

    public RetentionDiagnosisResponse(String videoId, String summary,
                                     List<RetentionDropEventDto> dropEvents,
                                     List<CreatorDiagnosisDto> diagnoses) {
        this.videoId = videoId;
        this.summary = summary;
        this.dropEvents = dropEvents;
        this.diagnoses = diagnoses;
    }

    public String getVideoId() { return videoId; }
    public String getSummary() { return summary; }
    public List<RetentionDropEventDto> getDropEvents() { return dropEvents; }
    public List<CreatorDiagnosisDto> getDiagnoses() { return diagnoses; }
}
