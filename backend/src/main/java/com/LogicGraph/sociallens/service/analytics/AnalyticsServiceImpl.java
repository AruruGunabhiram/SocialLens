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
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
        YouTubeChannel channel = resolveChannel(identifier);
        String channelId = channel.getChannelId();

        List<ChannelMetricsSnapshot> rawSnaps = channelSnapshotRepository
                .findByChannel_ChannelIdOrderByCapturedAtAsc(channelId);

        List<DailyMetricPointDto> points = groupAndMapToDaily(rawSnaps, metric);
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
    public TimeSeriesResponseDto getChannelTimeSeriesById(Long channelDbId, String metric, int rangeDays) {
        YouTubeChannel channel = channelRepository.findById(channelDbId)
                .orElseThrow(() -> new NotFoundException("Channel not found with id: " + channelDbId));

        // Include exactly `rangeDays` calendar days: [today - rangeDays + 1, today]
        LocalDate cutoff = LocalDate.now(ZoneOffset.UTC).minusDays(rangeDays - 1);
        List<ChannelMetricsSnapshot> rawSnaps = channelSnapshotRepository
                .findByChannelIdSince(channelDbId, cutoff);

        List<DailyMetricPointDto> points = groupAndMapToDaily(rawSnaps, metric);
        return new TimeSeriesResponseDto(channelDbId, channel.getChannelId(), metric, rangeDays, points);
    }

    // ============================================
    // Helper methods
    // ============================================

    private YouTubeChannel resolveChannel(String identifier) {
        return channelRepository.findByChannelId(identifier)
                .orElseThrow(() -> new NotFoundException("Channel not found: " + identifier));
    }

    /**
     * Groups snapshots by calendar day (picking the latest capturedAt per day),
     * then maps each day to a DailyMetricPointDto with a single value field.
     * The unique constraint on (channel_id, captured_day_utc) means at most one
     * snapshot per day in practice, but this is robust against duplicates.
     */
    // package-private for unit testing
    List<DailyMetricPointDto> groupAndMapToDaily(
            List<ChannelMetricsSnapshot> rawSnaps, String metric) {

        Map<LocalDate, ChannelMetricsSnapshot> byDay = new LinkedHashMap<>();
        for (ChannelMetricsSnapshot snap : rawSnaps) {
            byDay.merge(snap.getCapturedDayUtc(), snap,
                    (existing, incoming) ->
                            incoming.getCapturedAt().isAfter(existing.getCapturedAt())
                                    ? incoming : existing);
        }

        return byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new DailyMetricPointDto(
                        e.getKey().toString(),
                        extractMetricValue(e.getValue(), metric)))
                .toList();
    }

    private Long extractMetricValue(ChannelMetricsSnapshot snap, String metric) {
        return switch (metric.toUpperCase()) {
            case "SUBSCRIBERS" -> snap.getSubscriberCount() != null ? snap.getSubscriberCount() : 0L;
            case "UPLOADS"     -> snap.getVideoCount()       != null ? snap.getVideoCount()       : 0L;
            default            -> snap.getViewCount()        != null ? snap.getViewCount()        : 0L;
        };
    }

    @Override
    public double getChannelGrowthRate(String channelId, Duration period) {
        throw new UnsupportedOperationException("getChannelGrowthRate not yet implemented");
    }
}
