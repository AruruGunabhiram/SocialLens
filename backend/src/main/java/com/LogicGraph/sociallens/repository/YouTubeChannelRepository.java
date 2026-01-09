package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface YouTubeChannelRepository
        extends JpaRepository<YouTubeChannel, Long> {

    Optional<YouTubeChannel> findByChannelId(String channelId);
}
