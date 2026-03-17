package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.OAuthState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface OAuthStateRepository extends JpaRepository<OAuthState, Long> {

    Optional<OAuthState> findByState(String state);

    Optional<OAuthState> findByStateAndUsedFalseAndExpiresAtAfter(String state, Instant now);

    /** Deletes rows that have already been consumed OR have passed their expiry time. */
    @Modifying
    @Query("DELETE FROM OAuthState s WHERE s.used = true OR s.expiresAt < :now")
    int deleteExpiredAndUsed(@Param("now") Instant now);
}
