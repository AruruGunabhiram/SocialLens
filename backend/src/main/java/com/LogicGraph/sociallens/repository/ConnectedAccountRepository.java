package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.enums.Platform;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConnectedAccountRepository extends JpaRepository<ConnectedAccount, Long> {

    Optional<ConnectedAccount> findByUser_IdAndPlatform(Long userId, Platform platform);
    
    List<ConnectedAccount> findByStatus(ConnectedAccountStatus status);


}
