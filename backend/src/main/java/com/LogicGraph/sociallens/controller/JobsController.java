package com.LogicGraph.sociallens.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.LogicGraph.sociallens.jobs.DailyRefreshJob;

    
@RestController
@RequestMapping("/api/v1/jobs")

public class JobsController {

    private final DailyRefreshJob dailyRefreshJob;

    public JobsController(DailyRefreshJob dailyRefreshJob) {
        this.dailyRefreshJob = dailyRefreshJob;
    }

    @PostMapping("/daily-refresh/run")
    public ResponseEntity<String> runDailyRefreshNow() {
        dailyRefreshJob.runDailyRefresh();
        return ResponseEntity.ok("Triggered daily refresh");
    }
}

