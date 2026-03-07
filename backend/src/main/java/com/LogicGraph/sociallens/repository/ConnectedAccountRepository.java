package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.entity.User;
import com.LogicGraph.sociallens.enums.ConnectedAccountStatus;
import com.LogicGraph.sociallens.enums.Platform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ConnectedAccountRepository extends JpaRepository<ConnectedAccount, Long> {

    Optional<ConnectedAccount> findByUser_IdAndPlatform(Long userId, Platform platform);

    List<ConnectedAccount> findByStatus(ConnectedAccountStatus status);

    Optional<ConnectedAccount> findByUserAndPlatform(User user, Platform platform);

    // "tokenExpiresAt" in spec maps to entity field "expiresAt"
    List<ConnectedAccount> findByStatusAndExpiresAtBefore(ConnectedAccountStatus status, Instant threshold);

}

