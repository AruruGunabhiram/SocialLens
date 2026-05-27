package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import com.LogicGraph.sociallens.service.oauth.GoogleTokenRevoker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConnectedAccountServiceTest {

    @Mock private ConnectedAccountRepository connectedAccountRepository;
    @Mock private UserRepository userRepository;
    @Mock private GoogleTokenRevoker googleTokenRevoker;

    private ConnectedAccountService service;

    @BeforeEach
    void setUp() {
        service = new ConnectedAccountService(connectedAccountRepository, userRepository, googleTokenRevoker);
    }

    // -------------------------------------------------------------------------

    /**
     * upsertConnection must never replace an existing non-null refresh token
     * with a null/blank one from the request.
     */
    @Test
    void upsertConnection_neverOverwritesRefreshTokenWithNull() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", 1L);

        ConnectedAccount existing = new ConnectedAccount(
                Platform.YOUTUBE, "UC_old", "old-access", "existing-refresh-token",
                Instant.now().plusSeconds(3600), "scope", user);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(existing));
        when(connectedAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConnectAccountRequest req = new ConnectAccountRequest();
        req.setPlatform(Platform.YOUTUBE);
        req.setChannelId("UC_new");
        req.setAccessToken("new-access-token");
        req.setRefreshToken(null);   // null incoming refresh token
        req.setExpiresAt(Instant.now().plusSeconds(3600));
        req.setScopes("scope");

        service.upsertConnection(1L, req);

        // The refresh token must be unchanged
        assertThat(existing.getRefreshToken()).isEqualTo("existing-refresh-token");
    }

    /**
     * Reconnecting after a user-initiated disconnect must reactivate the retained
     * account row instead of leaving the UI stuck in "Connect YouTube".
     */
    @Test
    void upsertConnection_reactivatesDisconnectedAccount() {
        User user = new User();
        ReflectionTestUtils.setField(user, "id", 1L);

        ConnectedAccount existing = new ConnectedAccount(
                Platform.YOUTUBE, "UC_old", "old-access", null,
                Instant.now().minusSeconds(60), "scope", user);
        existing.setStatus(ConnectedAccountStatus.DISCONNECTED);
        existing.setDisconnectReason("User-initiated disconnect");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(existing));
        when(connectedAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConnectAccountRequest req = new ConnectAccountRequest();
        req.setPlatform(Platform.YOUTUBE);
        req.setChannelId("UC_new");
        req.setAccessToken("new-access-token");
        req.setRefreshToken("new-refresh-token");
        req.setExpiresAt(Instant.now().plusSeconds(3600));
        req.setScopes("scope");

        service.upsertConnection(1L, req);

        assertThat(existing.getStatus()).isEqualTo(ConnectedAccountStatus.ACTIVE);
        assertThat(existing.getDisconnectReason()).isNull();
        assertThat(existing.getRefreshToken()).isEqualTo("new-refresh-token");
    }

    /**
     * isConnected must return false when the repository finds no account
     * for the given userId + platform.
     */
    @Test
    void isConnected_noAccount_returnsFalse() {
        when(connectedAccountRepository.findByUser_IdAndPlatform(99L, Platform.YOUTUBE))
                .thenReturn(Optional.empty());

        boolean result = service.isConnected(99L, Platform.YOUTUBE);

        assertThat(result).isFalse();
    }

    // -------------------------------------------------------------------------
    // findAccount
    // -------------------------------------------------------------------------

    @Test
    void findAccount_returnsEmpty_whenNoAccount() {
        when(connectedAccountRepository.findByUser_IdAndPlatform(99L, Platform.YOUTUBE))
                .thenReturn(Optional.empty());

        assertThat(service.findAccount(99L, Platform.YOUTUBE)).isEmpty();
    }

    @Test
    void findAccount_returnsAccount_whenExists() {
        User user = new User();
        ConnectedAccount account = new ConnectedAccount(
                Platform.YOUTUBE, "UCxxx", "access-token", "refresh-token",
                Instant.now().plusSeconds(3600), "scope", user);

        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));

        assertThat(service.findAccount(1L, Platform.YOUTUBE)).isPresent();
    }

    // -------------------------------------------------------------------------
    // disconnect — Google token revocation
    // -------------------------------------------------------------------------

    /**
     * When a refresh token is present, disconnect() must pass it to the revoker
     * (refresh token preferred over access token), then mark the account
     * DISCONNECTED and null both tokens locally.
     */
    @Test
    void disconnect_revokesRefreshToken_andMarksAccountDisconnected() {
        User user = new User();
        ConnectedAccount account = new ConnectedAccount(
                Platform.YOUTUBE, "UCxxx", "access-token", "refresh-token",
                Instant.now().plusSeconds(3600), "scope", user);

        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(connectedAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        // revoker is a no-op mock by default — just verify it's called

        service.disconnect(1L, Platform.YOUTUBE);

        // Revoker must be called with the refresh token (not the access token)
        verify(googleTokenRevoker, times(1)).revokeQuietly("refresh-token");

        // Local account state must be cleaned up regardless
        assertThat(account.getStatus()).isEqualTo(ConnectedAccountStatus.DISCONNECTED);
        assertThat(account.getAccessToken()).isNull();
        assertThat(account.getRefreshToken()).isNull();
        assertThat(account.getDisconnectReason()).isEqualTo("User-initiated disconnect");
    }

    /**
     * When no refresh token is present, disconnect() falls back to revoking the
     * access token.
     */
    @Test
    void disconnect_revokesAccessToken_whenNoRefreshTokenPresent() {
        User user = new User();
        ConnectedAccount account = new ConnectedAccount(
                Platform.YOUTUBE, "UCxxx", "access-token", null /* no refresh token */,
                Instant.now().plusSeconds(3600), "scope", user);

        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(connectedAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.disconnect(1L, Platform.YOUTUBE);

        verify(googleTokenRevoker, times(1)).revokeQuietly("access-token");
        assertThat(account.getStatus()).isEqualTo(ConnectedAccountStatus.DISCONNECTED);
    }

    /**
     * If the revoker throws (e.g. network failure), disconnect() must still
     * complete successfully — the local account must be marked DISCONNECTED.
     */
    @Test
    void disconnect_succeeds_whenRevocationFails() {
        User user = new User();
        ConnectedAccount account = new ConnectedAccount(
                Platform.YOUTUBE, "UCxxx", "access-token", "refresh-token",
                Instant.now().plusSeconds(3600), "scope", user);

        when(connectedAccountRepository.findByUser_IdAndPlatform(1L, Platform.YOUTUBE))
                .thenReturn(Optional.of(account));
        when(connectedAccountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // revokeQuietly() itself never throws by design, but guard against accidental throws
        doThrow(new RuntimeException("simulated revocation failure"))
                .when(googleTokenRevoker).revokeQuietly(anyString());

        // disconnect must not propagate the revoker's exception
        assertThatNoException().isThrownBy(() -> service.disconnect(1L, Platform.YOUTUBE));

        assertThat(account.getStatus()).isEqualTo(ConnectedAccountStatus.DISCONNECTED);
        assertThat(account.getAccessToken()).isNull();
        assertThat(account.getRefreshToken()).isNull();
    }

}
