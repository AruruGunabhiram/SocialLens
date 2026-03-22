package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.exception.ConnectedAccountNotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConnectedAccountService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final UserRepository userRepository;

    public ConnectedAccountService(
            ConnectedAccountRepository connectedAccountRepository,
            UserRepository userRepository) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.userRepository = userRepository;
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
