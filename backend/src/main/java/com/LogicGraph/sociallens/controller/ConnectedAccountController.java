package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
     *
     * MVP: replace userId param with real auth later.
     */
    @GetMapping("/status")
    public Map<String, Object> status(
            @RequestParam Long userId,
            @RequestParam Platform platform) {
        Optional<ConnectedAccount> account = accountService.findAccount(userId, platform);
        boolean connected = account.isPresent();

        Map<String, Object> resp = new HashMap<>();
        resp.put("userId", userId);
        resp.put("platform", platform);
        resp.put("connected", connected);
        account.ifPresent(a -> resp.put("accountStatus", a.getStatus().name()));
        return resp;
    }
}
