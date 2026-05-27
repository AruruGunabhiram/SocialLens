package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.exception.InsufficientApiQuotaException;
import com.LogicGraph.sociallens.exception.RefreshAlreadyRunningException;
import com.LogicGraph.sociallens.jobs.ApiCallBudget;
import com.LogicGraph.sociallens.jobs.DailyRefreshJob;
import com.LogicGraph.sociallens.jobs.DailyRefreshWorker;
import com.LogicGraph.sociallens.jobs.SyncCooldownGuard;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobsController {

    private final DailyRefreshJob dailyRefreshJob;
    private final DailyRefreshWorker dailyRefreshWorker;
    private final ApiCallBudget apiCallBudget;
    private final SyncCooldownGuard cooldownGuard;

    public JobsController(DailyRefreshJob dailyRefreshJob, DailyRefreshWorker dailyRefreshWorker,
                          ApiCallBudget apiCallBudget, SyncCooldownGuard cooldownGuard) {
        this.dailyRefreshJob = dailyRefreshJob;
        this.dailyRefreshWorker = dailyRefreshWorker;
        this.apiCallBudget = apiCallBudget;
        this.cooldownGuard = cooldownGuard;
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
     *   202 – refresh triggered successfully (SUCCESS or PARTIAL)
     *   404 – channel not found
     *   409 – refresh already in progress for this channel
     *   429 – rate limited: either the per-channel cooldown has not expired or the
     *         daily YouTube API quota is exhausted; {@code Retry-After} header is set
     *   500 – refresh failed (root-cause message included)
     *
     * <p>Pre-checks (before any YouTube API call):
     * <ol>
     *   <li><b>Cooldown:</b> rejects within {@link SyncCooldownGuard#getCooldownSeconds()} of the
     *       last successful refresh for this channel — prevents rapid quota burn from repeated clicks.</li>
     *   <li><b>Budget:</b> rejects immediately when the daily {@link ApiCallBudget} is exhausted,
     *       rather than letting the refresh start and fail partway through.</li>
     * </ol>
     */
    @PostMapping("/refresh/channel")
    public ResponseEntity<Map<String, Object>> refreshSingleChannel(@RequestParam Long channelDbId) {

        // ── Pre-check 1: per-channel cooldown ────────────────────────────────
        if (cooldownGuard.isOnCooldown(channelDbId)) {
            long retryAfter = cooldownGuard.secondsRemaining(channelDbId);
            Map<String, Object> body = refreshPayload("rate_limited", channelDbId,
                    "Refresh too frequent. Wait " + retryAfter + "s before retrying.");
            body.put("retryAfterSeconds", retryAfter);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter))
                    .body(body);
        }

        // ── Pre-check 2: API quota budget ─────────────────────────────────────
        if (apiCallBudget.getRemaining() < 1) {
            long retryAfter = secondsUntilYouTubeQuotaReset();
            Map<String, Object> body = refreshPayload("quota_exhausted", channelDbId,
                    "YouTube API quota exhausted for today. Resets at midnight Pacific Time.");
            body.put("retryAfterSeconds", retryAfter);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter))
                    .body(body);
        }

        try {
            DailyRefreshWorker.RefreshResult result = dailyRefreshWorker.refreshOneChannel(channelDbId);

            // Record completion so the cooldown guard can enforce the quiet period.
            cooldownGuard.recordCompleted(channelDbId);

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

        } catch (InsufficientApiQuotaException ex) {
            // Budget ran out mid-refresh (decremented inside YouTubeServiceImpl).
            // Must be caught before the generic Exception to return 429 instead of 500.
            long retryAfter = secondsUntilYouTubeQuotaReset();
            Map<String, Object> body = refreshPayload("quota_exhausted", channelDbId,
                    "YouTube API quota exhausted. Resets at midnight Pacific Time.");
            body.put("retryAfterSeconds", retryAfter);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter))
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

    /**
     * GET /api/v1/jobs/budget
     * Returns the current YouTube Data API call budget status.
     */
    @GetMapping("/budget")
    public Map<String, Object> budget() {
        int total = apiCallBudget.getDailyQuota();
        int remaining = apiCallBudget.getRemaining();
        int used = total - remaining;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("dailyQuota", total);
        body.put("remaining", remaining);
        body.put("used", used);
        body.put("percentUsed", total > 0 ? Math.round((used * 100.0) / total) : 0);
        return body;
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

    /**
     * YouTube Data API quota resets at midnight Pacific Time.
     * Returns the number of seconds from now until that reset.
     */
    private long secondsUntilYouTubeQuotaReset() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("America/Los_Angeles"));
        ZonedDateTime midnight = now.toLocalDate().plusDays(1).atStartOfDay(now.getZone());
        return Duration.between(now, midnight).getSeconds();
    }
}
