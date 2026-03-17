package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface YouTubeChannelRepository
        extends JpaRepository<YouTubeChannel, Long> {

    Optional<YouTubeChannel> findByChannelId(String channelId);

    Optional<YouTubeChannel> findByHandle(String handle);

    List<YouTubeChannel> findByActiveTrue();

    List<YouTubeChannel> findByActiveTrueOrderByTitleAsc();

    List<YouTubeChannel> findAllByOrderByTitleAsc();

    /**
     * Resets all channels stuck in IN_PROGRESS to FAILED on startup.
     * Called by ApplicationStartupListener to handle JVM-crash recovery.
     */
    @Modifying
    @Query("UPDATE YouTubeChannel c SET c.lastRefreshStatus = :target, c.lastRefreshError = :reason " +
           "WHERE c.lastRefreshStatus = :stuck")
    int resetStaleLocks(
            @Param("stuck")  RefreshStatus stuck,
            @Param("target") RefreshStatus target,
            @Param("reason") String reason);
}
