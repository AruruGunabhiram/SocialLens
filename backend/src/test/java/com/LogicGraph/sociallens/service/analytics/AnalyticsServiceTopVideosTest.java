package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.TopVideosDto;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AnalyticsServiceTopVideosTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private YouTubeChannelRepository channelRepository;

    @Autowired
    private YouTubeVideoRepository videoRepository;

    @Autowired
    private VideoMetricsSnapshotRepository videoSnapshotRepository;

    @Autowired
    private ChannelMetricsSnapshotRepository channelSnapshotRepository;

    private YouTubeChannel testChannel;

    @BeforeEach
    void setUp() {
        // Clean up in correct order (delete dependent entities first)
        videoSnapshotRepository.deleteAll();
        channelSnapshotRepository.deleteAll();
        videoRepository.deleteAll();
        channelRepository.deleteAll();

        // Create test channel
        testChannel = new YouTubeChannel();
        testChannel.setChannelId("UC_test123");
        testChannel.setTitle("Test Channel");
        testChannel.setSubscriberCount(100000L);
        testChannel.setViewCount(5000000L);
        testChannel.setVideoCount(50L);
        testChannel = channelRepository.save(testChannel);

        // Create test videos with varying view counts
        createVideo("video1", "First Video", 1000000L, 50000L, 1000L);
        createVideo("video2", "Second Video", 500000L, 25000L, 500L);
        createVideo("video3", "Third Video", 2000000L, 100000L, 2000L);
        createVideo("video4", "Fourth Video", 750000L, 30000L, 750L);
        createVideo("video5", "Fifth Video", 1500000L, 75000L, 1500L);
    }

    private void createVideo(String videoId, String title, Long views, Long likes, Long comments) {
        YouTubeVideo video = new YouTubeVideo();
        video.setVideoId(videoId);
        video.setTitle(title);
        video.setChannel(testChannel);
        video.setViewCount(views);
        video.setLikeCount(likes);
        video.setCommentCount(comments);
        videoRepository.save(video);
    }

    @Test
    void getTopVideosShouldReturnVideosOrderedByViews() {
        // When: get top 3 videos by channelId
        TopVideosDto result = analyticsService.getTopVideos(testChannel.getChannelId(), 3);

        // Then: should return 3 videos ordered by view count descending
        assertThat(result).isNotNull();
        assertThat(result.channelId()).isEqualTo("UC_test123");
        assertThat(result.videos()).isNotEmpty();
        assertThat(result.videos()).hasSize(3);

        // Verify order: Third Video (2M) > Fifth Video (1.5M) > First Video (1M)
        assertThat(result.videos().get(0).videoId()).isEqualTo("video3");
        assertThat(result.videos().get(0).title()).isEqualTo("Third Video");
        assertThat(result.videos().get(0).views()).isEqualTo(2000000L);

        assertThat(result.videos().get(1).videoId()).isEqualTo("video5");
        assertThat(result.videos().get(1).views()).isEqualTo(1500000L);

        assertThat(result.videos().get(2).videoId()).isEqualTo("video1");
        assertThat(result.videos().get(2).views()).isEqualTo(1000000L);
    }

    @Test
    void getTopVideosByIdShouldReturnVideosOrderedByViews() {
        // When: get top 3 videos by channelDbId
        TopVideosDto result = analyticsService.getTopVideosById(testChannel.getId(), 3);

        // Then: should return 3 videos ordered by view count descending
        assertThat(result).isNotNull();
        assertThat(result.channelId()).isEqualTo("UC_test123");
        assertThat(result.videos()).isNotEmpty();
        assertThat(result.videos()).hasSize(3);

        // Verify order and all fields
        TopVideosDto.TopVideoItemDto topVideo = result.videos().get(0);
        assertThat(topVideo.videoId()).isEqualTo("video3");
        assertThat(topVideo.title()).isEqualTo("Third Video");
        assertThat(topVideo.views()).isEqualTo(2000000L);
        assertThat(topVideo.likes()).isEqualTo(100000L);
        assertThat(topVideo.comments()).isEqualTo(2000L);
    }

    @Test
    void getTopVideosShouldHandleLimitGreaterThanTotal() {
        // When: request more videos than exist
        TopVideosDto result = analyticsService.getTopVideos(testChannel.getChannelId(), 100);

        // Then: should return all 5 videos
        assertThat(result.videos()).hasSize(5);
    }

    @Test
    void getTopVideosShouldHandleChannelWithNoVideos() {
        // Given: a channel with no videos
        YouTubeChannel emptyChannel = new YouTubeChannel();
        emptyChannel.setChannelId("UC_empty");
        emptyChannel.setTitle("Empty Channel");
        emptyChannel = channelRepository.save(emptyChannel);

        // When: get top videos
        TopVideosDto result = analyticsService.getTopVideos(emptyChannel.getChannelId(), 10);

        // Then: should return empty list
        assertThat(result.channelId()).isEqualTo("UC_empty");
        assertThat(result.videos()).isEmpty();
    }

    @Test
    void getTopVideosShouldHandleNullMetrics() {
        // Given: a video with null metrics
        YouTubeVideo videoWithNulls = new YouTubeVideo();
        videoWithNulls.setVideoId("video_null");
        videoWithNulls.setTitle("Video with Null Metrics");
        videoWithNulls.setChannel(testChannel);
        videoWithNulls.setViewCount(null);
        videoWithNulls.setLikeCount(null);
        videoWithNulls.setCommentCount(null);
        videoRepository.save(videoWithNulls);

        // When: get top videos
        TopVideosDto result = analyticsService.getTopVideos(testChannel.getChannelId(), 10);

        // Then: null metrics should be converted to 0
        TopVideosDto.TopVideoItemDto nullVideo = result.videos().stream()
                .filter(v -> v.videoId().equals("video_null"))
                .findFirst()
                .orElseThrow();

        assertThat(nullVideo.views()).isEqualTo(0L);
        assertThat(nullVideo.likes()).isEqualTo(0L);
        assertThat(nullVideo.comments()).isEqualTo(0L);
    }
}
