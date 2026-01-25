package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.OAuthState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OAuthStateRepository extends JpaRepository<OAuthState, Long> {
    Optional<OAuthState> findByState(String state);
}
