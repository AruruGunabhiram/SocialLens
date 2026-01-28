package com.LogicGraph.sociallens.entity;

import com.LogicGraph.sociallens.enums.Platform;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "connected_accounts", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "platform" })
})
public class ConnectedAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Platform platform;

    @Column(name = "channel_id", nullable = false)
    private String channelId;

    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "scopes", columnDefinition = "TEXT")
    private String scopes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    protected ConnectedAccount() {
    }

    public ConnectedAccount(
            Platform platform,
            String channelId,
            String accessToken,
            String refreshToken,
            Instant expiresAt,
            String scopes,
            User user) {
        this.platform = platform;
        this.channelId = channelId;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
        this.scopes = scopes;
        this.user = user;
    }

    // ===== getters =====
    public Long getId() {
        return id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public String getChannelId() {
        return channelId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String getScopes() {
        return scopes;
    }

    public User getUser() {
        return user;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    // ===== setters (needed for update-in-place) =====
    public void setChannelId(String channelId) {
        this.channelId = channelId;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public void setScopes(String scopes) {
        this.scopes = scopes;
    }

    /**
     * Update tokens safely:
     * - Always update access token + expiry
     * - Only overwrite refresh token if a new one is provided
     */
    public void updateTokens(String accessToken, String maybeRefreshToken, Instant expiresAt, String scopes) {
        this.accessToken = accessToken;
        this.expiresAt = expiresAt;
        this.scopes = scopes;

        if (maybeRefreshToken != null && !maybeRefreshToken.isBlank()) {
            this.refreshToken = maybeRefreshToken;
        }
    }
}
