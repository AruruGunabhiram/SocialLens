package com.LogicGraph.sociallens.service.creator;

import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisRequest;
import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisResponse;

public interface RetentionDiagnosisService {
    RetentionDiagnosisResponse diagnoseRetention(RetentionDiagnosisRequest request);
}
