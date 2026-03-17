package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ChannelsServiceImpl implements ChannelsService {

    private final YouTubeChannelRepository youTubeChannelRepository;
    private final ChannelMetricsSnapshotRepository channelMetricsSnapshotRepository;

    public ChannelsServiceImpl(YouTubeChannelRepository youTubeChannelRepository,
                               ChannelMetricsSnapshotRepository channelMetricsSnapshotRepository) {
        this.youTubeChannelRepository = youTubeChannelRepository;
        this.channelMetricsSnapshotRepository = channelMetricsSnapshotRepository;
    }

    @Override
    public List<ChannelListItemDto> listChannels(boolean includeInactive) {
        List<YouTubeChannel> channels = includeInactive
                ? youTubeChannelRepository.findAllByOrderByTitleAsc()
                : youTubeChannelRepository.findByActiveTrueOrderByTitleAsc();

        // Batch-fetch latest snapshots in a single query (replaces N+1).
        List<Long> ids = channels.stream().map(YouTubeChannel::getId).toList();
        Map<Long, Instant> latestSnapshotAt = ids.isEmpty()
                ? Map.of()
                : channelMetricsSnapshotRepository.findLatestPerChannel(ids).stream()
                        .collect(Collectors.toMap(
                                s -> s.getChannel().getId(),
                                ChannelMetricsSnapshot::getCapturedAt,
                                (a, b) -> a)); // keep first on tie (unique constraint means no ties)

        return channels.stream()
                .sorted(Comparator.comparing(
                        YouTubeChannel::getTitle,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(ch -> toListItemDto(ch, latestSnapshotAt.get(ch.getId())))
                .collect(Collectors.toList());
    }

    @Override
    public ChannelDetailDto getChannelById(Long channelDbId) {
        YouTubeChannel channel = youTubeChannelRepository.findById(channelDbId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Channel not found with id: " + channelDbId));
        return toDetailDto(channel);
    }

    // -------------------------------------------------------------------------
    // Private mappers
    // -------------------------------------------------------------------------

    private ChannelListItemDto toListItemDto(YouTubeChannel ch, Instant lastSnapshotAt) {
        ChannelListItemDto dto = new ChannelListItemDto();
        dto.id = ch.getId();
        dto.title = ch.getTitle();
        dto.handle = ch.getHandle();
        dto.channelId = ch.getChannelId();
        dto.active = ch.isActive();
        dto.lastSuccessfulRefreshAt = ch.getLastSuccessfulRefreshAt();
        dto.lastRefreshStatus = ch.getLastRefreshStatus();
        dto.subscriberCount = ch.getSubscriberCount();
        dto.viewCount = ch.getViewCount();
        dto.videoCount = ch.getVideoCount();
        dto.lastSnapshotAt = lastSnapshotAt;
        return dto;
    }

    private ChannelDetailDto toDetailDto(YouTubeChannel ch) {
        ChannelDetailDto dto = new ChannelDetailDto();
        dto.id = ch.getId();
        dto.title = ch.getTitle();
        dto.handle = ch.getHandle();
        dto.channelId = ch.getChannelId();
        dto.active = ch.isActive();
        dto.description = ch.getDescription();
        dto.thumbnailUrl = ch.getThumbnailUrl();
        dto.country = ch.getCountry();
        dto.publishedAt = ch.getPublishedAt();
        dto.lastSuccessfulRefreshAt = ch.getLastSuccessfulRefreshAt();
        dto.lastRefreshStatus = ch.getLastRefreshStatus();
        dto.subscriberCount = ch.getSubscriberCount();
        dto.viewCount = ch.getViewCount();
        dto.videoCount = ch.getVideoCount();
        // Single-channel detail: one extra SELECT is acceptable here
        dto.lastSnapshotAt = channelMetricsSnapshotRepository
                .findTopByChannel_IdOrderByCapturedAtDesc(ch.getId())
                .map(ChannelMetricsSnapshot::getCapturedAt)
                .orElse(null);
        return dto;
    }
}
