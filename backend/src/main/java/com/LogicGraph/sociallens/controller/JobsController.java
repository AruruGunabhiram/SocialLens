package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.exception.RefreshAlreadyRunningException;
import com.LogicGraph.sociallens.jobs.DailyRefreshJob;
import com.LogicGraph.sociallens.jobs.DailyRefreshWorker;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobsController {

    private final DailyRefreshJob dailyRefreshJob;
    private final DailyRefreshWorker dailyRefreshWorker;

    public JobsController(DailyRefreshJob dailyRefreshJob, DailyRefreshWorker dailyRefreshWorker) {
        this.dailyRefreshJob = dailyRefreshJob;
        this.dailyRefreshWorker = dailyRefreshWorker;
    }

    /** Trigger the full daily refresh for all active channels. */
    @PostMapping("/daily-refresh/run")
    public ResponseEntity<String> runDailyRefreshNow() {
        dailyRefreshJob.runDailyRefresh();
        return ResponseEntity.ok("Triggered daily refresh");
    }

    /**
     * POST /api/v1/jobs/refresh/channel?channelDbId={id}
     * Triggers an on-demand refresh for a single channel by its database ID.
     *
     * Responses:
     *   202 – refresh triggered successfully
     *   409 – refresh already in progress for this channel
     *   500 – refresh failed (root-cause message included)
     */
    @PostMapping("/refresh/channel")
    public ResponseEntity<Map<String, Object>> refreshSingleChannel(@RequestParam Long channelDbId) {
        try {
            DailyRefreshWorker.RefreshResult result = dailyRefreshWorker.refreshOneChannel(channelDbId);
            String statusStr = switch (result.outcomeStatus()) {
                case PARTIAL -> "partial_success";
                default -> "success";
            };
            Map<String, Object> body = refreshPayload(statusStr, channelDbId, null);
            body.put("outcomeStatus", result.outcomeStatus().name());
            body.put("videosDiscovered", result.videosDiscovered());
            body.put("videosEnriched", result.videosEnriched());
            body.put("markedInactive", result.markedInactive());
            body.put("enrichmentErrors", result.enrichmentErrors());
            return ResponseEntity
                    .status(HttpStatus.ACCEPTED)
                    .body(body);

        } catch (RefreshAlreadyRunningException ex) {
            Map<String, Object> body = refreshPayload("already_running", channelDbId, null);
            body.put("message", "Refresh already in progress for this channel.");
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(body);

        } catch (IllegalArgumentException ex) {
            // Channel not found in DailyRefreshWorker.refreshOneChannel
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(refreshPayload("not_found", channelDbId, ex.getMessage()));

        } catch (Exception ex) {
            String rootCause = ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage();
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(refreshPayload("failed", channelDbId,
                            "Refresh failed: " + rootCause));
        }
    }

    private Map<String, Object> refreshPayload(String status, Long channelDbId, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("channelDbId", channelDbId);
        if (message != null) {
            body.put("message", message);
        }
        return body;
    }
}
