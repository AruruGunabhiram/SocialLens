package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConnectedAccountRepository extends JpaRepository<ConnectedAccount, Long> {
}
