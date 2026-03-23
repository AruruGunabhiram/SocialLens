package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.VideosPageResponseDto;
import com.LogicGraph.sociallens.dto.channels.VideoSortKey;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link ChannelVideosServiceImpl}.
 *
 * Key assertion: null entity stats must pass through as null in VideoRowDto —
 * they must NOT be converted to 0. Zero (viewCount=0) is meaningful and
 * distinct from "data unavailable" (likeCount=null when likes are disabled).
 */
@ExtendWith(MockitoExtension.class)
class ChannelVideosServiceImplTest {

    @Mock
    private YouTubeChannelRepository channelRepo;

    @Mock
    private YouTubeVideoRepository videoRepo;

    private ChannelVideosServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ChannelVideosServiceImpl(channelRepo, videoRepo);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private YouTubeVideo makeVideo(String videoId, String title, Long viewCount,
                                   Long likeCount, Long commentCount) {
        YouTubeChannel ch = new YouTubeChannel();
        ch.setChannelId("UCtest");

        YouTubeVideo v = new YouTubeVideo();
        v.setVideoId(videoId);
        v.setChannel(ch);
        v.setTitle(title);
        v.setPublishedAt(Instant.parse("2024-06-01T12:00:00Z"));
        v.setThumbnailUrl("https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg");
        v.setViewCount(viewCount);
        v.setLikeCount(likeCount);
        v.setCommentCount(commentCount);
        v.setActive(true);
        return v;
    }

    private VideosPageResponseDto fetchPage(YouTubeVideo video) {
        when(channelRepo.existsById(1L)).thenReturn(true);
        when(videoRepo.findByChannel_IdAndActiveTrue(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(video)));
        return service.getVideos(1L, null, VideoSortKey.publishedAt, Sort.Direction.DESC, 0, 25);
    }

    // ── null-stat pass-through ────────────────────────────────────────────────

    /**
     * When YouTube omits a stat field (e.g. likes disabled), the entity stores null.
     * VideoRowDto must preserve null — not coerce it to 0.
     * 0 is meaningful (zero views on a brand-new video); null means "unavailable".
     */
    @Test
    void nullStats_preservedAsNullInDto() {
        YouTubeVideo video = makeVideo("abc12345678", "Test Video", null, null, null);
        VideosPageResponseDto response = fetchPage(video);

        assertThat(response.items).hasSize(1);
        assertThat(response.items.get(0).viewCount).isNull();
        assertThat(response.items.get(0).likeCount).isNull();
        assertThat(response.items.get(0).commentCount).isNull();
    }

    /**
     * Explicit zero (a brand-new video with 0 views) must not be confused with null.
     */
    @Test
    void zeroStats_preservedAsZeroInDto() {
        YouTubeVideo video = makeVideo("abc12345678", "New Video", 0L, 0L, 0L);
        VideosPageResponseDto response = fetchPage(video);

        assertThat(response.items.get(0).viewCount).isEqualTo(0L);
        assertThat(response.items.get(0).likeCount).isEqualTo(0L);
        assertThat(response.items.get(0).commentCount).isEqualTo(0L);
    }

    /**
     * Mixed: viewCount non-null, likeCount null (likes hidden), commentCount non-null.
     */
    @Test
    void mixedStats_eachPreservedCorrectly() {
        YouTubeVideo video = makeVideo("abc12345678", "Mixed Video", 150_000L, null, 320L);
        VideosPageResponseDto response = fetchPage(video);

        assertThat(response.items.get(0).viewCount).isEqualTo(150_000L);
        assertThat(response.items.get(0).likeCount).isNull();
        assertThat(response.items.get(0).commentCount).isEqualTo(320L);
    }

    // ── title / videoId pass-through ─────────────────────────────────────────

    /**
     * A video synced before enrichment runs has no title. The DTO must expose
     * null so the frontend can detect it and show the videoId as fallback.
     */
    @Test
    void nullTitle_preservedAsNullInDto() {
        YouTubeVideo video = makeVideo("abc12345678", null, 1000L, 50L, 10L);
        VideosPageResponseDto response = fetchPage(video);

        assertThat(response.items.get(0).title).isNull();
        assertThat(response.items.get(0).videoId).isEqualTo("abc12345678");
    }

    @Test
    void populatedTitle_preservedInDto() {
        YouTubeVideo video = makeVideo("abc12345678", "My Awesome Video", 5000L, 200L, 30L);
        VideosPageResponseDto response = fetchPage(video);

        assertThat(response.items.get(0).title).isEqualTo("My Awesome Video");
    }

    // ── channel-not-found guard ───────────────────────────────────────────────

    @Test
    void channelNotFound_throws404() {
        when(channelRepo.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() ->
                service.getVideos(99L, null, VideoSortKey.publishedAt, Sort.Direction.DESC, 0, 25))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Channel not found");
    }
}
