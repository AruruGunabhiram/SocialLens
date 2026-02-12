package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/connected-accounts")
public class ConnectedAccountController {

    private final ConnectedAccountService accountService;

    public ConnectedAccountController(ConnectedAccountService accountService) {
        this.accountService = accountService;
    }

    // MVP: replace with your real auth later
    // For now, pass userId explicitly to keep Phase 5B moving.
    @GetMapping("/status")
    public Map<String, Object> status(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        boolean connected = accountService.isConnected(userId, platform);
        return Map.of(
                "userId", userId,
                "platform", platform,
                "connected", connected);
    }
}
