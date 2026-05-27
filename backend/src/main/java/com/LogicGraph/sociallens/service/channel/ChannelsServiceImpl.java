package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoHashtagRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository.IndexedCountRow;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        private final VideoMetricsSnapshotRepository videoMetricsSnapshotRepository;
        private final YouTubeVideoRepository youTubeVideoRepository;
        private final VideoHashtagRepository videoHashtagRepository;

    public ChannelsServiceImpl(YouTubeChannelRepository youTubeChannelRepository,
                                                           ChannelMetricsSnapshotRepository channelMetricsSnapshotRepository,
                                                           VideoMetricsSnapshotRepository videoMetricsSnapshotRepository,
                                                           YouTubeVideoRepository youTubeVideoRepository,
                                                           VideoHashtagRepository videoHashtagRepository) {
        this.youTubeChannelRepository = youTubeChannelRepository;
        this.channelMetricsSnapshotRepository = channelMetricsSnapshotRepository;
                this.videoMetricsSnapshotRepository = videoMetricsSnapshotRepository;
                this.youTubeVideoRepository = youTubeVideoRepository;
                this.videoHashtagRepository = videoHashtagRepository;
    }

    @Override
    public List<ChannelListItemDto> listChannels(boolean includeInactive) {
        List<YouTubeChannel> channels = includeInactive
                ? youTubeChannelRepository.findAllByOrderByTitleAsc()
                : youTubeChannelRepository.findByActiveTrueOrderByTitleAsc();

        // Batch-fetch latest snapshots, snapshot counts, and indexed video counts in single
        // queries — avoids N+1 selects for each per-channel aggregation.
        List<Long> ids = channels.stream().map(YouTubeChannel::getId).toList();
        Map<Long, Instant> latestSnapshotAt = ids.isEmpty()
                ? Map.of()
                : channelMetricsSnapshotRepository.findLatestPerChannel(ids).stream()
                        .collect(Collectors.toMap(
                                s -> s.getChannel().getId(),
                                ChannelMetricsSnapshot::getCapturedAt,
                                (a, b) -> a)); // keep first on tie (unique constraint means no ties)

        Map<Long, Long> snapshotCounts = ids.isEmpty()
                ? Map.of()
                : channelMetricsSnapshotRepository.countSnapshotsPerChannel(ids).stream()
                        .collect(Collectors.toMap(
                                ChannelMetricsSnapshotRepository.SnapshotCountRow::getChannelId,
                                ChannelMetricsSnapshotRepository.SnapshotCountRow::getSnapshotCount));

        // Indexed video counts: how many videos are actually stored in our DB per channel.
        // This differs from YouTubeChannel.videoCount which is the YouTube Data API total.
        Map<Long, Long> indexedVideoCounts = ids.isEmpty()
                ? Map.of()
                : youTubeVideoRepository.countIndexedVideosPerChannel(ids).stream()
                        .collect(Collectors.toMap(
                                IndexedCountRow::getChannelId,
                                IndexedCountRow::getVideoCount));

        return channels.stream()
                .sorted(Comparator.comparing(
                        YouTubeChannel::getTitle,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(ch -> toListItemDto(ch,
                        latestSnapshotAt.get(ch.getId()),
                        snapshotCounts.getOrDefault(ch.getId(), 0L),
                        indexedVideoCounts.getOrDefault(ch.getId(), 0L)))
                .collect(Collectors.toList());
    }

    @Override
    public ChannelDetailDto getChannelById(Long channelDbId) {
        YouTubeChannel channel = youTubeChannelRepository.findById(channelDbId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Channel not found with id: " + channelDbId));
        return toDetailDto(channel);
    }

        @Override
        @Transactional
        public void deleteChannelById(Long channelDbId) {
                if (!youTubeChannelRepository.existsById(channelDbId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Channel not found with id: " + channelDbId);
                }

                videoHashtagRepository.deleteByVideo_Channel_Id(channelDbId);
                channelMetricsSnapshotRepository.deleteByChannel_Id(channelDbId);
                videoMetricsSnapshotRepository.deleteByVideo_Channel_Id(channelDbId);
                youTubeVideoRepository.deleteByChannel_Id(channelDbId);
                youTubeChannelRepository.deleteById(channelDbId);
        }

    // -------------------------------------------------------------------------
    // Private mappers
    // -------------------------------------------------------------------------

    private ChannelListItemDto toListItemDto(YouTubeChannel ch, Instant lastSnapshotAt,
                                              Long snapshotDayCount, Long indexedVideoCount) {
        ChannelListItemDto dto = new ChannelListItemDto();
        dto.id = ch.getId();
        dto.title = ch.getTitle();
        dto.handle = ch.getHandle();
        dto.channelId = ch.getChannelId();
        dto.active = ch.isActive();
        dto.lastSuccessfulRefreshAt = ch.getLastSuccessfulRefreshAt();
        dto.lastRefreshStatus = ch.getLastRefreshStatus();
        dto.lastRefreshError = ch.getLastRefreshError();
        dto.subscriberCount = ch.getSubscriberCount();
        dto.viewCount = ch.getViewCount();
        // videoCount = YouTube Data API total; indexedVideoCount = what SocialLens has stored
        dto.videoCount = ch.getVideoCount();
        dto.indexedVideoCount = indexedVideoCount;
        dto.lastSnapshotAt = lastSnapshotAt;
        dto.snapshotDayCount = snapshotDayCount;
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
        dto.lastRefreshError = ch.getLastRefreshError();
        dto.subscriberCount = ch.getSubscriberCount();
        dto.viewCount = ch.getViewCount();
        dto.videoCount = ch.getVideoCount();
        // Single-channel detail: two extra SELECTs are acceptable here
        dto.lastSnapshotAt = channelMetricsSnapshotRepository
                .findTopByChannel_IdOrderByCapturedAtDesc(ch.getId())
                .map(ChannelMetricsSnapshot::getCapturedAt)
                .orElse(null);
        dto.snapshotDayCount = channelMetricsSnapshotRepository.countByChannel_Id(ch.getId());
        return dto;
    }
}
