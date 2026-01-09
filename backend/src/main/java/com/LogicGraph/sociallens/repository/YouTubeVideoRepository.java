package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeVideo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface YouTubeVideoRepository
        extends JpaRepository<YouTubeVideo, Long> {

    Optional<YouTubeVideo> findByVideoId(String videoId);

    List<YouTubeVideo> findByChannel_ChannelId(String channelId);
}
