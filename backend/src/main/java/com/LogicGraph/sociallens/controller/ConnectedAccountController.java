package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
     *   { userId, platform, connected: boolean, accountStatus?: string }
     *
     * accountStatus is present only when an account row exists; values match
     * ConnectedAccountStatus enum: ACTIVE | EXPIRED | REFRESH_FAILED | REVOKED | DISCONNECTED
     */
    @GetMapping("/status")
    public Map<String, Object> status(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        Optional<ConnectedAccount> account = accountService.findAccount(userId, platform);
        boolean connected = account.map(a -> a.getStatus() == ConnectedAccountStatus.ACTIVE
                || a.getStatus() == ConnectedAccountStatus.EXPIRED
                || a.getStatus() == ConnectedAccountStatus.REFRESH_FAILED).orElse(false);

        Map<String, Object> resp = new HashMap<>();
        resp.put("userId", userId);
        resp.put("platform", platform);
        resp.put("connected", connected);
        account.ifPresent(a -> resp.put("accountStatus", a.getStatus().name()));
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
