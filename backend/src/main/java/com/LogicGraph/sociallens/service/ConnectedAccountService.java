package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.account.ConnectAccountRequest;
import com.LogicGraph.sociallens.dto.account.ConnectedAccountResponse;
import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ConnectedAccountService {

    private final ConnectedAccountRepository accountRepository;
    private final UserRepository userRepository;

    public ConnectedAccountService(ConnectedAccountRepository accountRepository,
                                   UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
    }

    public ConnectedAccountResponse connectAccount(ConnectAccountRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        ConnectedAccount account = new ConnectedAccount(
                request.getPlatform(),
                request.getExternalAccountId(),
                user
        );

        ConnectedAccount saved = accountRepository.save(account);

        return new ConnectedAccountResponse(
                saved.getId(),
                saved.getPlatform(),
                saved.getExternalAccountId()
        );
    }
}
