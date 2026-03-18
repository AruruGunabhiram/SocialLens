package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
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

    private ConnectedAccountService service;

    @BeforeEach
    void setUp() {
        service = new ConnectedAccountService(connectedAccountRepository, userRepository);
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

}
