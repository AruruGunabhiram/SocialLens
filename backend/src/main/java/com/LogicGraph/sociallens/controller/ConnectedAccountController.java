package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.service.ConnectedAccountService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
public class ConnectedAccountController {

    private final ConnectedAccountService accountService;

    public ConnectedAccountController(ConnectedAccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ConnectedAccountResponse connect(@RequestBody ConnectAccountRequest request) {
        return accountService.connectAccount(request);
    }
}
