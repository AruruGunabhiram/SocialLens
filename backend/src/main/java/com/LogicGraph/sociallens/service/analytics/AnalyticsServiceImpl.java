package com.LogicGraph.sociallens.service.analytics;

import com.LogicGraph.sociallens.dto.analytics.*;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

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
            subscribers = latest.getSubscriberCount();
            totalViews = latest.getViewCount();

            if (totalVideos == 0L && latest.getVideoCount() != null) {
                totalVideos = latest.getVideoCount();
            }
        }

        return new ChannelAnalyticsDto(
                channel.getChannelId(),
                channel.getTitle(),
                subscribers,
                totalViews,
                totalVideos,
                Collections.emptyList(),
                Collections.emptyList());
    }

    @Override
    public TopVideosDto getTopVideos(String identifier, int limit) {
        YouTubeChannel channel = resolveChannel(identifier);
        return new TopVideosDto(channel.getChannelId(), Collections.emptyList());
    }

    @Override
    public UploadFrequencyDto getUploadFrequency(String identifier, int weeks) {
        YouTubeChannel channel = resolveChannel(identifier);
        List<TimeSeriesPointDto> empty = Collections.emptyList();
        return new UploadFrequencyDto(channel.getChannelId(), "WEEK", empty);
    }

    private YouTubeChannel resolveChannel(String identifier) {
        return channelRepository.findByChannelId(identifier)
                .orElseThrow(() -> new NotFoundException("Channel not found: " + identifier));
    }
}
