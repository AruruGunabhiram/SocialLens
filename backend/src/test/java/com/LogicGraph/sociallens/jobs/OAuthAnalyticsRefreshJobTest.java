package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.TokenRefreshFailedException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthAnalyticsRefreshJobTest {

    @Mock private ConnectedAccountRepository connectedAccountRepository;
    @Mock private YouTubeOAuthService oauthService;

    private OAuthAnalyticsRefreshJob job;
    private JobProperties props;

    @BeforeEach
    void setUp() {
        props = new JobProperties();
        // Enable globally and for oauth-refresh so the guard passes
        ReflectionTestUtils.setField(props, "enabled", true);
        job = new OAuthAnalyticsRefreshJob(props, connectedAccountRepository, oauthService);
    }

    // -------------------------------------------------------------------------
    // maxAccountsPerRun enforcement
    // -------------------------------------------------------------------------

    /**
     * When the repository returns more accounts than maxAccountsPerRun,
     * oauthService.refreshIfNeeded must be called exactly maxAccountsPerRun times.
     */
    @Test
    void runOAuthRefresh_respectsMaxAccountsPerRun() throws Exception {
        int max = 3;
        ReflectionTestUtils.setField(props.getOauthRefresh(), "maxAccountsPerRun", max);

        // Return 5 accounts — only 3 should be processed
        List<ConnectedAccount> accounts = buildAccounts(5);
        when(connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE))
                .thenReturn(accounts);
        when(oauthService.refreshIfNeeded(any())).thenReturn(false);

        job.runOAuthRefresh();

        // refreshIfNeeded must be called exactly `max` times, not 5
        verify(oauthService, times(max)).refreshIfNeeded(any());
    }

    /**
     * When the account count is below maxAccountsPerRun, every account is processed.
     */
    @Test
    void runOAuthRefresh_processesAllAccounts_whenUnderLimit() throws Exception {
        ReflectionTestUtils.setField(props.getOauthRefresh(), "maxAccountsPerRun", 10);

        List<ConnectedAccount> accounts = buildAccounts(4);
        when(connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE))
                .thenReturn(accounts);
        when(oauthService.refreshIfNeeded(any())).thenReturn(false);

        job.runOAuthRefresh();

        verify(oauthService, times(4)).refreshIfNeeded(any());
    }

    /**
     * When the account count exactly equals maxAccountsPerRun, all accounts are processed.
     */
    @Test
    void runOAuthRefresh_processesAllAccounts_whenExactlyAtLimit() throws Exception {
        int max = 5;
        ReflectionTestUtils.setField(props.getOauthRefresh(), "maxAccountsPerRun", max);

        List<ConnectedAccount> accounts = buildAccounts(max);
        when(connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE))
                .thenReturn(accounts);
        when(oauthService.refreshIfNeeded(any())).thenReturn(false);

        job.runOAuthRefresh();

        verify(oauthService, times(max)).refreshIfNeeded(any());
    }

    // -------------------------------------------------------------------------
    // Guard: disabled job
    // -------------------------------------------------------------------------

    /**
     * When the global job switch is off, no repository call is made.
     */
    @Test
    void runOAuthRefresh_globallyDisabled_skipsProcessing() {
        ReflectionTestUtils.setField(props, "enabled", false);

        job.runOAuthRefresh();

        verifyNoInteractions(connectedAccountRepository, oauthService);
    }

    /**
     * When oauth-refresh is individually disabled, no repository call is made.
     */
    @Test
    void runOAuthRefresh_oauthRefreshDisabled_skipsProcessing() {
        ReflectionTestUtils.setField(props.getOauthRefresh(), "enabled", false);

        job.runOAuthRefresh();

        verifyNoInteractions(connectedAccountRepository, oauthService);
    }

    // -------------------------------------------------------------------------
    // Per-account failure isolation
    // -------------------------------------------------------------------------

    /**
     * When one account's refresh throws, the job must continue processing the
     * remaining accounts and must not propagate the exception.
     */
    @Test
    void runOAuthRefresh_oneAccountFails_continuesRemainingAccounts() throws Exception {
        ReflectionTestUtils.setField(props.getOauthRefresh(), "maxAccountsPerRun", 10);

        List<ConnectedAccount> accounts = buildAccounts(3);
        when(connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE))
                .thenReturn(accounts);

        // Second account throws a token-refresh failure; first and third must still run
        when(oauthService.refreshIfNeeded(accounts.get(0))).thenReturn(false);
        when(oauthService.refreshIfNeeded(accounts.get(1)))
                .thenThrow(new TokenRefreshFailedException("2", "refresh token missing"));
        when(oauthService.refreshIfNeeded(accounts.get(2))).thenReturn(true);

        // Job must not rethrow
        assertThatNoException().isThrownBy(() -> job.runOAuthRefresh());

        // All three accounts were attempted
        verify(oauthService, times(3)).refreshIfNeeded(any());
    }

    /**
     * Zero accounts: job completes without touching oauthService.
     */
    @Test
    void runOAuthRefresh_noActiveAccounts_completesQuietly() {
        ReflectionTestUtils.setField(props.getOauthRefresh(), "maxAccountsPerRun", 200);
        when(connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE))
                .thenReturn(List.of());

        assertThatNoException().isThrownBy(() -> job.runOAuthRefresh());
        verifyNoInteractions(oauthService);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private List<ConnectedAccount> buildAccounts(int count) {
        List<ConnectedAccount> list = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            User user = new User();
            ConnectedAccount acc = new ConnectedAccount(
                    Platform.YOUTUBE, "UCtest" + i, "access-" + i, "refresh-" + i,
                    Instant.now().plusSeconds(3600), "scope", user);
            ReflectionTestUtils.setField(acc, "id", (long) i);
            list.add(acc);
        }
        return list;
    }
}
