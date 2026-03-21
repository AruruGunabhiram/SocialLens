package com.LogicGraph.sociallens.service.creator;

import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisRequest;
import com.LogicGraph.sociallens.dto.creator.RetentionDiagnosisResponse;
import com.LogicGraph.sociallens.dto.creator.RetentionPoint;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import com.LogicGraph.sociallens.service.youtube.YouTubeAnalyticsClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RetentionDiagnosisServiceImplTest {

    @Mock private ConnectedAccountRepository connectedAccountRepository;
    @Mock private YouTubeOAuthService youTubeOAuthService;
    @Mock private YouTubeAnalyticsClient youTubeAnalyticsClient;

    private RetentionDiagnosisServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new RetentionDiagnosisServiceImpl(
                connectedAccountRepository, youTubeOAuthService, youTubeAnalyticsClient);
    }

    // -------------------------------------------------------------------------
    // diagnoseRetention — orchestration paths
    // -------------------------------------------------------------------------

    /**
     * No connected YouTube account for the userId → NotFoundException before any
     * OAuth or analytics call.
     */
    @Test
    void diagnoseRetention_noConnectedAccount_throwsNotFoundException() {
        when(connectedAccountRepository.findByUser_IdAndPlatform(99L, Platform.YOUTUBE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.diagnoseRetention(request(99L, "vid1")))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("99");

        verifyNoInteractions(youTubeOAuthService, youTubeAnalyticsClient);
    }

    /**
     * YouTube Analytics API returns no retention points for the video/range →
     * response is returned immediately with an explanatory summary and empty lists.
     */
    @Test
    void diagnoseRetention_emptyRetentionCurve_returnsNoDataSummary() {
        ConnectedAccount account = account("UCtest", "tok");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok");
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidEmpty"));

        assertThat(resp.getVideoId()).isEqualTo("vidEmpty");
        assertThat(resp.getSummary()).contains("No retention data");
        assertThat(resp.getDropEvents()).isEmpty();
        assertThat(resp.getDiagnoses()).isEmpty();
        verify(connectedAccountRepository, never()).save(any());
    }

    /**
     * Flat/gradual curve below the drop threshold → no drop events, no diagnoses,
     * summary confirms no issues found.
     */
    @Test
    void diagnoseRetention_flatCurve_returnsNoDiagnosis() {
        ConnectedAccount account = account("UCtest", "tok");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok");

        // Drop per step ≈ 2.5% — well below the 8% threshold
        List<RetentionPoint> curve = new ArrayList<>(List.of(
                new RetentionPoint(0.00, 1.00),
                new RetentionPoint(0.25, 0.975),
                new RetentionPoint(0.50, 0.950),
                new RetentionPoint(0.75, 0.925),
                new RetentionPoint(1.00, 0.900)
        ));
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(curve);

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidFlat"));

        assertThat(resp.getDropEvents()).isEmpty();
        assertThat(resp.getDiagnoses()).isEmpty();
        assertThat(resp.getSummary()).isEqualTo("No major retention drops detected.");
    }

    // -------------------------------------------------------------------------
    // Diagnosis label routing — one test per branch
    // -------------------------------------------------------------------------

    /**
     * Large early drop (first 5% of video) → HOOK_WEAK_OR_MISMATCH.
     * Severity is HIGH: drop 0.30 ≥ 0.15 threshold.
     */
    @Test
    void diagnoseRetention_hookDrop_returnsHookWeakDiagnosis() {
        ConnectedAccount account = account("UCtest", "tok");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok");

        // Drop 0.30 over 0.05 progress → slope = 6.0, HIGH; mid = 0.025 (≤ 0.10 → HOOK)
        List<RetentionPoint> curve = new ArrayList<>(List.of(
                new RetentionPoint(0.00, 1.00),
                new RetentionPoint(0.05, 0.70),
                new RetentionPoint(0.50, 0.65),
                new RetentionPoint(1.00, 0.55)
        ));
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(curve);

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidHook"));

        assertThat(resp.getDiagnoses()).hasSize(1);
        assertThat(resp.getDiagnoses().get(0).getLabel()).isEqualTo("HOOK_WEAK_OR_MISMATCH");
        assertThat(resp.getDiagnoses().get(0).getSeverity()).isEqualTo("HIGH");
        assertThat(resp.getSummary()).containsIgnoringCase("hook");
        assertThat(resp.getDropEvents()).hasSize(1);
    }

    /**
     * Significant drop in the 30–40% range → PACING_OR_TOPIC_SHIFT.
     */
    @Test
    void diagnoseRetention_midVideoDrop_returnsPacingDiagnosis() {
        ConnectedAccount account = account("UCtest", "tok2");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok2");

        // Drop 0.15 over 0.10 → slope = 1.5, HIGH; mid = 0.35 (10% < mid ≤ 60% → PACING)
        List<RetentionPoint> curve = new ArrayList<>(List.of(
                new RetentionPoint(0.0, 1.00),
                new RetentionPoint(0.3, 0.85),
                new RetentionPoint(0.4, 0.70),
                new RetentionPoint(1.0, 0.60)
        ));
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(curve);

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidMid"));

        assertThat(resp.getDiagnoses()).hasSize(1);
        assertThat(resp.getDiagnoses().get(0).getLabel()).isEqualTo("PACING_OR_TOPIC_SHIFT");
        assertThat(resp.getSummary()).containsIgnoringCase("pacing");
    }

    /**
     * Big drop in the last 15% → OUTRO_TOO_LONG (mid ≥ 0.80).
     */
    @Test
    void diagnoseRetention_outroDrop_returnsOutroDiagnosis() {
        ConnectedAccount account = account("UCtest", "tok3");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok3");

        // Drop 0.20 over 0.09 → slope ≈ 2.22, HIGH; mid = (0.83 + 0.92) / 2 = 0.875 (≥ 0.80 → OUTRO)
        List<RetentionPoint> curve = new ArrayList<>(List.of(
                new RetentionPoint(0.0,  1.00),
                new RetentionPoint(0.5,  0.90),
                new RetentionPoint(0.83, 0.85),
                new RetentionPoint(0.92, 0.65),
                new RetentionPoint(1.0,  0.55)
        ));
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(curve);

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidOutro"));

        assertThat(resp.getDiagnoses()).hasSize(1);
        assertThat(resp.getDiagnoses().get(0).getLabel()).isEqualTo("OUTRO_TOO_LONG");
        assertThat(resp.getSummary()).containsIgnoringCase("outro");
    }

    /**
     * Drop in the 60–80% range → STRUCTURE_DIP (the default/else branch).
     */
    @Test
    void diagnoseRetention_structureDrop_returnsStructureDipDiagnosis() {
        ConnectedAccount account = account("UCtest", "tok4");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("tok4");

        // Drop 0.18 over 0.10 → slope = 1.8, HIGH; mid = (0.65 + 0.75) / 2 = 0.70 (60% < mid < 80% → STRUCTURE)
        List<RetentionPoint> curve = new ArrayList<>(List.of(
                new RetentionPoint(0.00, 1.00),
                new RetentionPoint(0.65, 0.88),
                new RetentionPoint(0.75, 0.70),
                new RetentionPoint(1.00, 0.60)
        ));
        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(curve);

        RetentionDiagnosisResponse resp = service.diagnoseRetention(request(1L, "vidStruct"));

        assertThat(resp.getDiagnoses()).hasSize(1);
        assertThat(resp.getDiagnoses().get(0).getLabel()).isEqualTo("STRUCTURE_DIP");
    }

    // -------------------------------------------------------------------------
    // Token refresh persistence guard
    // -------------------------------------------------------------------------

    /**
     * If getValidAccessToken mutates the account (refresh happened), the updated
     * ConnectedAccount must be saved back to the database.
     */
    @Test
    void diagnoseRetention_tokenRefreshed_savesAccountToDb() {
        // Create with an already-expired token so we can simulate a refresh
        ConnectedAccount account = new ConnectedAccount(
                Platform.YOUTUBE, "UCtest", "old-tok", "refresh-tok",
                Instant.now().minusSeconds(120), "scope", null);

        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));

        // Simulate refresh: OAuth service mutates access token and expiry in place
        when(youTubeOAuthService.getValidAccessToken(account)).thenAnswer(inv -> {
            account.setAccessToken("new-tok");
            account.setExpiresAt(Instant.now().plusSeconds(3600));
            return "new-tok";
        });

        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());

        service.diagnoseRetention(request(1L, "vid"));

        verify(connectedAccountRepository).save(account);
    }

    /**
     * If the access token did not change (no refresh was needed), the account
     * must NOT be re-saved to avoid dirty writes.
     */
    @Test
    void diagnoseRetention_tokenUnchanged_doesNotSaveAccount() {
        ConnectedAccount account = account("UCtest", "fresh-tok");
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(youTubeOAuthService.getValidAccessToken(account)).thenReturn("fresh-tok");

        when(youTubeAnalyticsClient.fetchAudienceRetentionCurve(any(), any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());

        service.diagnoseRetention(request(1L, "vid"));

        verify(connectedAccountRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private RetentionDiagnosisRequest request(Long userId, String videoId) {
        RetentionDiagnosisRequest req = new RetentionDiagnosisRequest();
        req.setUserId(userId);
        req.setVideoId(videoId);
        return req;
    }

    /** Creates a ConnectedAccount using the public constructor; User is null (Hibernate not active in unit tests). */
    private ConnectedAccount account(String channelId, String accessToken) {
        return new ConnectedAccount(
                Platform.YOUTUBE,
                channelId,
                accessToken,
                "dummy-refresh-token",
                Instant.now().plusSeconds(3600),
                "https://www.googleapis.com/auth/yt-analytics.readonly",
                null
        );
    }
}
