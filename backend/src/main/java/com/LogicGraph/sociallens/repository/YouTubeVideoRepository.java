// Changelog: Added pageable video query for capped job fetching; added title-OR-videoId JPQL search; added findVideoIdsByChannelDbId and findAllByVideoIdIn for video enrichment.
package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
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

    /**
     * Returns a capped list of videoIds for a channel ordered newest-first (by DB id).
     * Use with PageRequest.of(0, 50) to get the latest 50.
     */
    @Query("SELECT v.videoId FROM YouTubeVideo v WHERE v.channel.id = :channelDbId ORDER BY v.id DESC")
    List<String> findVideoIdsByChannelDbId(@Param("channelDbId") Long channelDbId, Pageable pageable);

    /** Batch-load video entities by their YouTube video IDs. */
    List<YouTubeVideo> findAllByVideoIdIn(Collection<String> videoIds);

    List<YouTubeVideo> findByChannel(YouTubeChannel channel);

    List<YouTubeVideo> findByChannelOrderByPublishedAtDesc(YouTubeChannel channel, Pageable pageable);

    /**
     * Search by title OR videoId (case-insensitive).
     * COALESCE on title handles videos where title has not been synced yet —
     * those rows still participate in the videoId match.
     */
    @Query("""
            SELECT v FROM YouTubeVideo v
            WHERE v.channel.id = :channelDbId
              AND (
                LOWER(COALESCE(v.title, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(v.videoId) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<YouTubeVideo> searchByChannelAndTitleOrVideoId(
            @Param("channelDbId") Long channelDbId,
            @Param("q") String q,
            Pageable pageable);

    /** Paginated active-only video list for the /channels/{id}/videos endpoint. */
    Page<YouTubeVideo> findByChannel_IdAndActiveTrue(Long channelDbId, Pageable pageable);

    /** Active-only search for the /channels/{id}/videos?q= endpoint. */
    @Query("""
            SELECT v FROM YouTubeVideo v
            WHERE v.channel.id = :channelDbId
              AND v.active = true
              AND (
                LOWER(COALESCE(v.title, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(v.videoId) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<YouTubeVideo> searchActiveByChannelAndTitleOrVideoId(
            @Param("channelDbId") Long channelDbId,
            @Param("q") String q,
            Pageable pageable);
}
