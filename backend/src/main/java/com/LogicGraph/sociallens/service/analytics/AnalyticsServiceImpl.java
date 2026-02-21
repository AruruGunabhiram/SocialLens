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

        var latestOpt = channelSnapshotRepository
                .findTopByChannel_ChannelIdOrderByCapturedAtDesc(channel.getChannelId());

        long subscribers = 0L;
        long totalViews = 0L;

        long totalVideos = videoRepository.countByChannel_ChannelId(channel.getChannelId());

        if (latestOpt.isPresent()) {
            var latest = latestOpt.get();
            subscribers = latest.getSubscriberCount() == null ? 0L : latest.getSubscriberCount();
            totalViews = latest.getViewCount() == null ? 0L : latest.getViewCount();

            if (totalVideos == 0L && latest.getVideoCount() != null) {
                totalVideos = latest.getVideoCount();
            }
        }
        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_ChannelIdOrderByCapturedAtAsc(channel.getChannelId());

        List<TimeSeriesPointDto> viewsTrend = snaps.stream()
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), s.getViewCount()))
                .toList();

        List<TimeSeriesPointDto> subscribersTrend = snaps.stream()
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), s.getSubscriberCount()))
                .toList();

        return new ChannelAnalyticsDto(
                channel.getChannelId(),
                channel.getTitle(),
                subscribers,
                totalViews,
                totalVideos,
                viewsTrend,
                subscribersTrend);
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
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), pickMetricValue(s, metric)))
                .toList();

        return new TimeSeriesResponseDto(channelId, metric, points);
    }

    private Long pickMetricValue(ChannelMetricsSnapshot s, String metric) {
        String m = (metric == null) ? "" : metric.toLowerCase();
        return switch (m) {
            case "views" -> s.getViewCount();
            case "subscribers" -> s.getSubscriberCount();
            case "videos" -> s.getVideoCount();
            default -> throw new IllegalArgumentException("Unsupported metric: " + metric);
        };
    }

    // ============================================
    // New methods using database channel ID
    // ============================================

    @Override
    public ChannelAnalyticsDto getChannelAnalyticsById(Long channelDbId) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));

        var latestOpt = channelSnapshotRepository
                .findTopByChannel_IdOrderByCapturedAtDesc(channelDbId);

        long subscribers = 0L;
        long totalViews = 0L;

        long totalVideos = videoRepository.countByChannel_Id(channelDbId);

        if (latestOpt.isPresent()) {
            var latest = latestOpt.get();
            subscribers = latest.getSubscriberCount() == null ? 0L : latest.getSubscriberCount();
            totalViews = latest.getViewCount() == null ? 0L : latest.getViewCount();

            if (totalVideos == 0L && latest.getVideoCount() != null) {
                totalVideos = latest.getVideoCount();
            }
        }

        List<ChannelMetricsSnapshot> snaps = channelSnapshotRepository
                .findByChannel_IdOrderByCapturedAtAsc(channelDbId);

        List<TimeSeriesPointDto> viewsTrend = snaps.stream()
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), s.getViewCount()))
                .toList();

        List<TimeSeriesPointDto> subscribersTrend = snaps.stream()
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), s.getSubscriberCount()))
                .toList();

        return new ChannelAnalyticsDto(
                channel.getChannelId(),
                channel.getTitle(),
                subscribers,
                totalViews,
                totalVideos,
                viewsTrend,
                subscribersTrend);
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
                .map(s -> new TimeSeriesPointDto(s.getCapturedAt(), pickMetricValue(s, metric)))
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
