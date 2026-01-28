package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisRequest;
import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisResponse;
import com.LogicGraph.sociallens.service.creator.RetentionDiagnosisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/creator")
public class CreatorIntelligenceController {

    private final RetentionDiagnosisService retentionDiagnosisService;

    public CreatorIntelligenceController(RetentionDiagnosisService retentionDiagnosisService) {
        this.retentionDiagnosisService = retentionDiagnosisService;
    }

    @PostMapping("/retention/diagnosis")
    public ResponseEntity<RetentionDiagnosisResponse> diagnose(@RequestBody RetentionDiagnosisRequest request) {
        return ResponseEntity.ok(retentionDiagnosisService.diagnoseRetention(request));
    }
}
