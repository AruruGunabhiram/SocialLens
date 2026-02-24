// Changelog: Added pageable video query for capped job fetching.
package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeVideo;
import org.springframework.data.domain.Page;
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

    // Database ID-based queries for direct channel DB ID access
    long countByChannel_Id(Long channelDbId);

    // Top videos queries (ordered by metrics)
    List<YouTubeVideo> findByChannel_ChannelIdOrderByViewCountDesc(String channelId, Pageable pageable);

    List<YouTubeVideo> findByChannel_IdOrderByViewCountDesc(Long channelDbId, Pageable pageable);

    // Paginated queries for the /channels/{id}/videos endpoint
    Page<YouTubeVideo> findByChannel_Id(Long channelDbId, Pageable pageable);

    Page<YouTubeVideo> findByChannel_IdAndTitleContainingIgnoreCase(Long channelDbId, String q, Pageable pageable);
}
