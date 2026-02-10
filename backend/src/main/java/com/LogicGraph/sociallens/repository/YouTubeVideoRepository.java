// Changelog: Added pageable video query for capped job fetching.
package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface YouTubeVideoRepository extends JpaRepository<YouTubeVideo, Long> {

    Optional<YouTubeVideo> findByVideoId(String videoId);

    List<YouTubeVideo> findByChannel_ChannelId(String channelId);

    List<YouTubeVideo> findAllByChannel_ChannelId(String channelId);

    List<YouTubeVideo> findByChannel_ChannelId(String channelId, Pageable pageable);

    long countByChannel_ChannelId(String channelId);
}
