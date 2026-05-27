package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/connected-accounts")
public class ConnectedAccountController {

    private final ConnectedAccountService accountService;

    public ConnectedAccountController(ConnectedAccountService accountService) {
        this.accountService = accountService;
    }

    /**
     * Returns the connection status for a user + platform.
     *
     * Response shape:
     *   {
     *     userId, platform,
     *     connected: boolean,          // true ONLY when status == ACTIVE
     *     accountStatus?: string,      // ACTIVE | EXPIRED | REFRESH_FAILED | REVOKED | DISCONNECTED
     *     channelId?: string,          // safe display field — no token data
     *     expiresAt?: string,          // ISO-8601 instant; null when not set
     *     createdAt?: string,          // when the account was first connected
     *     lastRefreshedAt?: string     // last successful token refresh
     *   }
     *
     * connected=true only when the token is ACTIVE so the UI can show the
     * correct degraded state for EXPIRED / REFRESH_FAILED accounts without
     * needing to call the API-key-protected /detail endpoint.
     */
    @GetMapping("/status")
    public Map<String, Object> status(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        Optional<ConnectedAccount> account = accountService.findAccount(userId, platform);

        // Only ACTIVE tokens are truly usable — EXPIRED/REFRESH_FAILED are degraded states.
        boolean connected = account.map(a -> a.getStatus() == ConnectedAccountStatus.ACTIVE)
                .orElse(false);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("userId", userId);
        resp.put("platform", platform);
        resp.put("connected", connected);
        account.ifPresent(a -> {
            resp.put("accountStatus", a.getStatus().name());
            // Safe display fields — no token or secret data included here
            resp.put("channelId", a.getChannelId());
            resp.put("expiresAt", a.getExpiresAt() != null ? a.getExpiresAt().toString() : null);
            resp.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
            resp.put("lastRefreshedAt", a.getLastRefreshedAt() != null ? a.getLastRefreshedAt().toString() : null);
        });
        return resp;
    }

    /**
     * Returns full account details for a user + platform.
     *
     * Response shape:
     *   { found: boolean, channelId, status, scopes, expiresAt, createdAt }
     */
    @GetMapping("/detail")
    public Map<String, Object> detail(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        Optional<ConnectedAccount> accountOpt = accountService.findAccount(userId, platform);
        if (accountOpt.isEmpty()) {
            return Map.of("found", false);
        }
        ConnectedAccount a = accountOpt.get();
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("found", true);
        resp.put("channelId", a.getChannelId());
        resp.put("status", a.getStatus().name());
        resp.put("scopes", a.getScopes());
        resp.put("expiresAt", a.getExpiresAt() != null ? a.getExpiresAt().toString() : null);
        resp.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : null);
        resp.put("lastRefreshedAt", a.getLastRefreshedAt() != null ? a.getLastRefreshedAt().toString() : null);
        return resp;
    }

    /**
     * POST /api/v1/connected-accounts/disconnect?userId={id}&platform={platform}
     * Marks the account DISCONNECTED and clears stored tokens.
     */
    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        try {
            accountService.disconnect(userId, platform);
            return ResponseEntity.ok(Map.of(
                    "disconnected", true,
                    "userId", userId,
                    "platform", platform.name()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("disconnected", false, "message", ex.getMessage()));
        }
    }
}
