package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.*;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesPointDto;
import com.LogicGraph.sociallens.dto.analytics.TimeSeriesResponseDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import java.util.List;

import java.util.Collections;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private final YouTubeChannelRepository channelRepository;
    private final YouTubeVideoRepository videoRepository;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepository;
    private final VideoMetricsSnapshotRepository videoSnapshotRepository;

    public AnalyticsServiceImpl(
            YouTubeChannelRepository channelRepository,
            YouTubeVideoRepository videoRepository,
            ChannelMetricsSnapshotRepository channelSnapshotRepository,
            VideoMetricsSnapshotRepository videoSnapshotRepository) {
        this.channelRepository = channelRepository;
        this.videoRepository = videoRepository;
        this.channelSnapshotRepository = channelSnapshotRepository;
        this.videoSnapshotRepository = videoSnapshotRepository;
    }

    @Override
    public ChannelAnalyticsDto getChannelAnalytics(String identifier) {
        YouTubeChannel channel = resolveChannel(identifier);

        // Read metrics directly from youtube_channel table (populated by sync)
        long subscriberCount = channel.getSubscriberCount() != null ? channel.getSubscriberCount() : 0L;
        long totalViews = channel.getViewCount() != null ? channel.getViewCount() : 0L;
        long videoCount = videoRepository.countByChannel_ChannelId(channel.getChannelId());

        // For timeseries, use snapshots if available
        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_ChannelIdOrderByCapturedAtAsc(channel.getChannelId());

        List<TimeSeriesPointDto> timeseries = snaps.stream()
                .map(s -> {
                    TimeSeriesPointDto dto = new TimeSeriesPointDto();
                    dto.date = s.getCapturedAt() != null ? s.getCapturedAt().toString() : "";
                    dto.views = s.getViewCount();
                    dto.subscribers = s.getSubscriberCount();
                    // likes and comments not set (will be omitted from JSON via NON_NULL)
                    dto.uploads = s.getVideoCount();
                    return dto;
                })
                .toList();

        return new ChannelAnalyticsDto(
                channel.getChannelId(),
                channel.getTitle(),
                subscriberCount,
                totalViews,
                videoCount,
                null,  // likeCount - not tracked at channel level
                null,  // commentCount - not tracked at channel level
                timeseries);
    }

    @Override
    public TopVideosDto getTopVideos(String identifier, int limit) {
        YouTubeChannel channel = resolveChannel(identifier);

        // Query youtube_video table ordered by viewCount descending
        Pageable pageable = PageRequest.of(0, limit);

        List<YouTubeVideo> videos =
                videoRepository.findByChannel_ChannelIdOrderByViewCountDesc(channel.getChannelId(), pageable);

        List<TopVideosDto.TopVideoItemDto> videoItems = videos.stream()
                .map(v -> new TopVideosDto.TopVideoItemDto(
                        v.getVideoId(),
                        v.getTitle() != null ? v.getTitle() : "",
                        v.getViewCount() != null ? v.getViewCount() : 0L,
                        v.getLikeCount() != null ? v.getLikeCount() : 0L,
                        v.getCommentCount() != null ? v.getCommentCount() : 0L
                ))
                .toList();

        return new TopVideosDto(channel.getChannelId(), videoItems);
    }

    @Override
    public UploadFrequencyDto getUploadFrequency(String identifier, int weeks) {
        YouTubeChannel channel = resolveChannel(identifier);
        List<TimeSeriesPointDto> empty = Collections.emptyList();
        return new UploadFrequencyDto(channel.getChannelId(), "WEEK", empty);
    }

    @Override
    public TimeSeriesResponseDto getChannelTimeSeries(String identifier, String metric) {

        // Reuse the SAME resolver you already use in other endpoints
        YouTubeChannel channel = resolveChannel(identifier);
        String channelId = channel.getChannelId();

        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_ChannelIdOrderByCapturedAtAsc(channelId);

        List<TimeSeriesPointDto> points = snaps.stream()
                .map(s -> {
                    TimeSeriesPointDto dto = new TimeSeriesPointDto();
                    dto.date = s.getCapturedAt() != null ? s.getCapturedAt().toString() : "";
                    dto.views = s.getViewCount();
                    dto.subscribers = s.getSubscriberCount();
                    // likes and comments not set (will be omitted from JSON via NON_NULL)
                    dto.uploads = s.getVideoCount();
                    return dto;
                })
                .toList();

        return new TimeSeriesResponseDto(channelId, metric, points);
    }

    // ============================================
    // New methods using database channel ID
    // ============================================

    @Override
    public ChannelAnalyticsDto getChannelAnalyticsById(Long channelDbId) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));

        // Read metrics directly from youtube_channel table (populated by sync)
        long subscriberCount = channel.getSubscriberCount() != null ? channel.getSubscriberCount() : 0L;
        long totalViews = channel.getViewCount() != null ? channel.getViewCount() : 0L;
        long videoCount = videoRepository.countByChannel_Id(channelDbId);

        // For timeseries, use snapshots if available
        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_IdOrderByCapturedAtAsc(channelDbId);

        List<TimeSeriesPointDto> timeseries = snaps.stream()
                .map(s -> {
                    TimeSeriesPointDto dto = new TimeSeriesPointDto();
                    dto.date = s.getCapturedAt() != null ? s.getCapturedAt().toString() : "";
                    dto.views = s.getViewCount();
                    dto.subscribers = s.getSubscriberCount();
                    // likes and comments not set (will be omitted from JSON via NON_NULL)
                    dto.uploads = s.getVideoCount();
                    return dto;
                })
                .toList();

        return new ChannelAnalyticsDto(
                channel.getChannelId(),
                channel.getTitle(),
                subscriberCount,
                totalViews,
                videoCount,
                null,  // likeCount - not tracked at channel level
                null,  // commentCount - not tracked at channel level
                timeseries);
    }

    @Override
    public TopVideosDto getTopVideosById(Long channelDbId, int limit) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));

        // Query youtube_video table ordered by viewCount descending
        Pageable pageable = PageRequest.of(0, limit);

        List<YouTubeVideo> videos =
                videoRepository.findByChannel_IdOrderByViewCountDesc(channelDbId, pageable);

        List<TopVideosDto.TopVideoItemDto> videoItems = videos.stream()
                .map(v -> new TopVideosDto.TopVideoItemDto(
                        v.getVideoId(),
                        v.getTitle() != null ? v.getTitle() : "",
                        v.getViewCount() != null ? v.getViewCount() : 0L,
                        v.getLikeCount() != null ? v.getLikeCount() : 0L,
                        v.getCommentCount() != null ? v.getCommentCount() : 0L
                ))
                .toList();

        return new TopVideosDto(channel.getChannelId(), videoItems);
    }

    @Override
    public UploadFrequencyDto getUploadFrequencyById(Long channelDbId, int weeks) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));
        List<TimeSeriesPointDto> empty = Collections.emptyList();
        return new UploadFrequencyDto(channel.getChannelId(), "WEEK", empty);
    }

    @Override
    public TimeSeriesResponseDto getChannelTimeSeriesById(Long channelDbId, String metric) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));

        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_IdOrderByCapturedAtAsc(channelDbId);

        List<TimeSeriesPointDto> points = snaps.stream()
                .map(s -> {
                    TimeSeriesPointDto dto = new TimeSeriesPointDto();
                    dto.date = s.getCapturedAt() != null ? s.getCapturedAt().toString() : "";
                    dto.views = s.getViewCount();
                    dto.subscribers = s.getSubscriberCount();
                    // likes and comments not set (will be omitted from JSON via NON_NULL)
                    dto.uploads = s.getVideoCount();
                    return dto;
                })
                .toList();

        return new TimeSeriesResponseDto(channel.getChannelId(), metric, points);
    }

    // ============================================
    // Helper methods
    // ============================================

    private YouTubeChannel resolveChannel(String identifier) {
        return channelRepository.findByChannelId(identifier)
                .orElseThrow(() -> new NotFoundException("Channel not found: " + identifier));
    }
}
