package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.ConnectedAccountNotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import com.LogicGraph.sociallens.service.oauth.GoogleTokenRevoker;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConnectedAccountService {

    private static final Logger log = LoggerFactory.getLogger(ConnectedAccountService.class);

    private final ConnectedAccountRepository connectedAccountRepository;
    private final UserRepository userRepository;
    private final GoogleTokenRevoker googleTokenRevoker;

    public ConnectedAccountService(
            ConnectedAccountRepository connectedAccountRepository,
            UserRepository userRepository,
            GoogleTokenRevoker googleTokenRevoker) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.userRepository = userRepository;
        this.googleTokenRevoker = googleTokenRevoker;
    }

    /**
     * Creates or updates the user's connection for a platform.
     * NOTE: refreshToken is optional; never overwrite an existing refresh token
     * with null/blank.
     */
    @Transactional
    public ConnectedAccountResponse upsertConnection(Long userId, ConnectAccountRequest request) {
        if (request.getPlatform() == null)
            throw new IllegalArgumentException("platform is required");
        if (request.getChannelId() == null || request.getChannelId().isBlank())
            throw new IllegalArgumentException("channelId is required");
        if (request.getAccessToken() == null || request.getAccessToken().isBlank())
            throw new IllegalArgumentException("accessToken is required");
        if (request.getExpiresAt() == null)
            throw new IllegalArgumentException("expiresAt is required");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));

        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, request.getPlatform())
                .orElse(null);

        if (account == null) {
            ConnectedAccount created = new ConnectedAccount(
                    request.getPlatform(),
                    request.getChannelId(),
                    request.getAccessToken(),
                    request.getRefreshToken(), // may be null
                    request.getExpiresAt(),
                    request.getScopes(),
                    user);

            ConnectedAccount saved = connectedAccountRepository.save(created);
            return toResponse(saved);
        }

        // Update in place (never wipe refresh token)
        account.setChannelId(request.getChannelId());
        account.setAccessToken(request.getAccessToken());
        account.setExpiresAt(request.getExpiresAt());
        account.setScopes(request.getScopes());
        account.setStatus(ConnectedAccountStatus.ACTIVE);
        account.setDisconnectReason(null);

        if (request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            account.setRefreshToken(request.getRefreshToken());
        }

        ConnectedAccount saved = connectedAccountRepository.save(account);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public boolean isConnected(Long userId, Platform platform) {
        return connectedAccountRepository
                .findByUser_IdAndPlatform(userId, platform)
                .isPresent();
    }

    @Transactional(readOnly = true)
    public Optional<ConnectedAccount> findAccount(Long userId, Platform platform) {
        return connectedAccountRepository.findByUser_IdAndPlatform(userId, platform);
    }

    /**
     * Marks a connected account as DISCONNECTED and clears its stored tokens.
     * The account row itself is retained so that createdAt / history is preserved.
     *
     * <p>Before nulling local tokens, the refresh token (or access token when no
     * refresh token is available) is revoked at Google's OAuth endpoint.  Revocation
     * failure is non-fatal: the account is still marked DISCONNECTED locally even if
     * the remote call fails.
     */
    @Transactional
    public void disconnect(Long userId, Platform platform) {
        ConnectedAccount account = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, platform)
                .orElseThrow(() -> new ConnectedAccountNotFoundException(
                        "No connected account for userId=" + userId + " platform=" + platform));

        // Capture the token to revoke BEFORE clearing local state.
        // Prefer the refresh token: revoking it invalidates all access tokens it issued.
        // Fall back to the access token when no refresh token is stored.
        String tokenToRevoke = (account.getRefreshToken() != null && !account.getRefreshToken().isBlank())
                ? account.getRefreshToken()
                : account.getAccessToken();

        log.info("Revoking Google token for userId={} platform={}", userId, platform);
        try {
            googleTokenRevoker.revokeQuietly(tokenToRevoke);
        } catch (Exception ex) {
            // revokeQuietly() is designed to never throw, but guard defensively so
            // revocation bugs can never block a user from disconnecting their account.
            log.warn("Unexpected exception during token revocation for userId={} platform={} — " +
                    "proceeding with local disconnect. cause={}: {}",
                    userId, platform, ex.getClass().getSimpleName(), ex.getMessage());
        }

        account.setStatus(ConnectedAccountStatus.DISCONNECTED);
        account.setDisconnectReason("User-initiated disconnect");
        account.setAccessToken(null);
        account.setRefreshToken(null);
        connectedAccountRepository.save(account);
    }

    @Transactional
    public ConnectedAccount save(ConnectedAccount account) {
        return connectedAccountRepository.save(account);
    }

    private ConnectedAccountResponse toResponse(ConnectedAccount saved) {
        return new ConnectedAccountResponse(
                saved.getId(),
                saved.getPlatform(),
                saved.getChannelId(),
                saved.getExpiresAt(),
                saved.getScopes());
    }
}
