package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConnectedAccountRepository extends JpaRepository<ConnectedAccount, Long> {
    Optional<ConnectedAccount> findByUserIdAndPlatform(Long userId, Platform platform);


}
