package com.LogicGraph.sociallens.service.creator;

import com.LogicGraph.sociallens.dto.creator.*;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import com.LogicGraph.sociallens.service.youtube.YouTubeAnalyticsClient;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
public class RetentionDiagnosisServiceImpl implements RetentionDiagnosisService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final YouTubeOAuthService youTubeOAuthService;
    private final YouTubeAnalyticsClient youTubeAnalyticsClient;

    public RetentionDiagnosisServiceImpl(
            ConnectedAccountRepository connectedAccountRepository,
            YouTubeOAuthService youTubeOAuthService,
            YouTubeAnalyticsClient youTubeAnalyticsClient) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.youTubeOAuthService = youTubeOAuthService;
        this.youTubeAnalyticsClient = youTubeAnalyticsClient;
    }

    @Override
    public RetentionDiagnosisResponse diagnoseRetention(RetentionDiagnosisRequest request) {
        LocalDate start = request.getStartDate() != null ? request.getStartDate() : LocalDate.now().minusDays(28);
        LocalDate end = request.getEndDate() != null ? request.getEndDate() : LocalDate.now();

        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(request.getUserId(), Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException(
                        "Connected YouTube account not found for userId=" + request.getUserId()));

        // --- Save only if refreshed ---
        String beforeToken = account.getAccessToken();
        Instant beforeExpiry = account.getExpiresAt();

        // Ensure token is valid (refresh may mutate account)
        String accessToken = youTubeOAuthService.getValidAccessToken(account);

        boolean changed = (beforeToken != null && !beforeToken.equals(account.getAccessToken())) ||
                (beforeToken == null && account.getAccessToken() != null) ||
                (beforeExpiry != null && account.getExpiresAt() != null && !beforeExpiry.equals(account.getExpiresAt()))
                ||
                (beforeExpiry == null && account.getExpiresAt() != null);

        if (changed) {
            connectedAccountRepository.save(account);
        }

        // --- DO NOT trust request.getChannelId() ---
        String channelId = account.getChannelId();

        List<RetentionPoint> points = youTubeAnalyticsClient.fetchAudienceRetentionCurve(
                accessToken,
                channelId,
                request.getVideoId(),
                start,
                end);

        if (points.isEmpty()) {
            return new RetentionDiagnosisResponse(
                    request.getVideoId(),
                    "No retention data available for this video in the selected date range.",
                    List.of(),
                    List.of());
        }

        points.sort(Comparator.comparingDouble(RetentionPoint::progress));

        List<RetentionDropEventDto> drops = detectDrops(points);
        List<CreatorDiagnosisDto> diagnoses = diagnoseFromDrops(drops);

        /* ✅ ADD THE LOG RIGHT HERE */
        log.info("Retention diagnosis: userId={}, videoId={}, points={}, topDrop={}",
                request.getUserId(),
                request.getVideoId(),
                points.size(),
                drops.isEmpty() ? "none" : drops.get(0).getDropMagnitude());

        String summary = toSummary(diagnoses, drops);

        return new RetentionDiagnosisResponse(request.getVideoId(), summary, drops, diagnoses);

    }


    private List<RetentionDropEventDto> detectDrops(List<RetentionPoint> pts) {
        List<RetentionDropEventDto> out = new ArrayList<>();

        for (int i = 1; i < pts.size(); i++) {
            RetentionPoint a = pts.get(i - 1);
            RetentionPoint b = pts.get(i);

            double dp = b.progress() - a.progress();
            if (dp <= 0)
                continue;

            double dr = a.watchRatio() - b.watchRatio(); // positive means drop
            double slope = dr / dp;

            // v1 thresholds (conservative)
            boolean isDrop = dr >= 0.08 && slope >= 0.60;
            if (!isDrop)
                continue;

            String severity = (dr >= 0.15 || slope >= 1.20) ? "HIGH"
                    : (dr >= 0.10 || slope >= 0.90) ? "MEDIUM"
                            : "LOW";

            out.add(new RetentionDropEventDto(a.progress(), b.progress(), dr, slope, severity));
        }

        return out;
    }

    private List<CreatorDiagnosisDto> diagnoseFromDrops(List<RetentionDropEventDto> drops) {
        List<CreatorDiagnosisDto> out = new ArrayList<>();
        if (drops.isEmpty())
            return out;

        // Sort by biggest drop first
        drops.sort((x, y) -> Double.compare(y.getDropMagnitude(), x.getDropMagnitude()));

        RetentionDropEventDto top = drops.get(0);
        double mid = (top.getStartProgress() + top.getEndProgress()) / 2.0;

        if (mid <= 0.10) {
            out.add(new CreatorDiagnosisDto(
                    "HOOK_WEAK_OR_MISMATCH",
                    top.getSeverity(),
                    evidence(top),
                    "Cut setup, show payoff in first 5–10 seconds, and align title/thumbnail with the first scene."));
        } else if (mid <= 0.60) {
            out.add(new CreatorDiagnosisDto(
                    "PACING_OR_TOPIC_SHIFT",
                    top.getSeverity(),
                    evidence(top),
                    "Tighten the segment at the drop: remove filler, add pattern interrupts, and preview the next payoff before transitions."));
        } else if (mid >= 0.80) {
            out.add(new CreatorDiagnosisDto(
                    "OUTRO_TOO_LONG",
                    top.getSeverity(),
                    evidence(top),
                    "Move CTA earlier, shorten end screen time, and end immediately after the final payoff."));
        } else {
            out.add(new CreatorDiagnosisDto(
                    "STRUCTURE_DIP",
                    top.getSeverity(),
                    evidence(top),
                    "Add a mid-video reset: recap value, tease what's next, and increase visual or narrative change at that moment."));
        }

        return out;
    }

    private String evidence(RetentionDropEventDto d) {
        return String.format("Retention fell %.0f%% between %.0f%% → %.0f%% of the video.",
                d.getDropMagnitude() * 100.0,
                d.getStartProgress() * 100.0,
                d.getEndProgress() * 100.0);
    }

    private String toSummary(List<CreatorDiagnosisDto> diagnoses, List<RetentionDropEventDto> drops) {
        if (diagnoses.isEmpty())
            return "No major retention drops detected.";

        CreatorDiagnosisDto top = diagnoses.get(0);
        RetentionDropEventDto d = drops.get(0);

        return switch (top.getLabel()) {
            case "HOOK_WEAK_OR_MISMATCH" ->
                String.format(
                        "Major early drop (%.0f%%) suggests weak hook or expectation mismatch. Fix the first 10 seconds.",
                        d.getDropMagnitude() * 100.0);
            case "PACING_OR_TOPIC_SHIFT" ->
                String.format(
                        "Mid-video drop (%.0f%%) suggests pacing issues or a content shift. Tighten the segment around %.0f%%.",
                        d.getDropMagnitude() * 100.0,
                        ((d.getStartProgress() + d.getEndProgress()) / 2.0) * 100.0);
            case "OUTRO_TOO_LONG" ->
                String.format("Late drop (%.0f%%) suggests outro/end-screen drag. End faster after the payoff.",
                        d.getDropMagnitude() * 100.0);
            default ->
                "Retention drop detected - review the segment at the drop and improve structure/pacing.";
        };
    }
}
