package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.service.channel.ChannelResolver;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;

@Service
public class YouTubeSyncService {

    private final YouTubeService youTubeService;
    private final YouTubeChannelRepository channelRepository;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepository;
    private final ChannelResolver channelResolver;

    public YouTubeSyncService(
            YouTubeService youTubeService,
            YouTubeChannelRepository channelRepository,
            ChannelMetricsSnapshotRepository channelSnapshotRepository,
            ChannelResolver channelResolver
    ) {
        this.youTubeService = youTubeService;
        this.channelRepository = channelRepository;
        this.channelSnapshotRepository = channelSnapshotRepository;
        this.channelResolver = channelResolver;
    }

    @Transactional
    public YouTubeSyncResponseDto syncChannelOnly(String identifier) {

        Instant start = Instant.now();
        System.out.println(">>> SYNC START identifier=" + identifier);

        // 1) Resolve identifier -> (type,value)
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        System.out.println(">>> RESOLVED type=" + resolved.getType() + " value=" + resolved.getValue());

        // 2) Fetch channel details (one API call)
        ChannelSummaryDto dto = youTubeService.getChannelSummary(resolved);
        System.out.println(">>> API OK title=" + dto.title + " channelId=" + dto.channelId);

        // 3) Upsert channel
        YouTubeChannel channel = channelRepository
                .findByChannelId(dto.channelId)
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId);
        channel.setTitle(dto.title);
        channel.setDescription(dto.description);

        YouTubeChannel savedChannel = channelRepository.save(channel);
        System.out.println(">>> CHANNEL SAVED id=" + savedChannel.getId());

        // 4) Snapshot (optional, but keep it — good for analytics history)
        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setCapturedAt(Instant.now());
        snap.setSubscriberCount(dto.subscribers);
        snap.setViewCount(dto.views);
        snap.setVideoCount(dto.videos);
        snap.setChannel(savedChannel);

        channelSnapshotRepository.save(snap);
        System.out.println(">>> SNAPSHOT SAVED");

        Instant finish = Instant.now();
        long durationMs = finish.toEpochMilli() - start.toEpochMilli();

        // 5) Response summary (videosFetched=0 for now)
        YouTubeSyncResponseDto res = new YouTubeSyncResponseDto();

        res.identifier = identifier;

        res.resolved = new YouTubeSyncResponseDto.Resolved();
        res.resolved.channelId = dto.channelId;
        res.resolved.resolvedFrom = resolved.getType().name();
        res.resolved.normalizedInput = resolved.getValue();

        res.result = new YouTubeSyncResponseDto.Result();
        res.result.videosFetched = 0;
        res.result.videosSaved = 0;
        res.result.videosUpdated = 0;
        res.result.pagesFetched = 0;
        res.result.pageSize = 0;

        res.timing = new YouTubeSyncResponseDto.Timing();
        res.timing.startedAt = start.toString();
        res.timing.finishedAt = finish.toString();
        res.timing.durationMs = durationMs;

        res.warnings = Collections.emptyList();

        return res;
    }

    // Keep old method if you still use it for direct channelId testing
    @Transactional
    public void syncChannelByChannelId(String channelId) {
        System.out.println(">>> SYNC START channelId=" + channelId);

        ChannelSummaryDto dto = youTubeService.getChannelSummaryByChannelId(channelId);
        System.out.println(">>> API OK title=" + dto.title);

        YouTubeChannel channel = channelRepository
                .findByChannelId(dto.channelId)
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId);
        channel.setTitle(dto.title);
        channel.setDescription(dto.description);

        YouTubeChannel savedChannel = channelRepository.save(channel);
        System.out.println(">>> CHANNEL SAVED id=" + savedChannel.getId());

        ChannelMetricsSnapshot snap = new ChannelMetricsSnapshot();
        snap.setCapturedAt(Instant.now());
        snap.setSubscriberCount(dto.subscribers);
        snap.setViewCount(dto.views);
        snap.setVideoCount(dto.videos);
        snap.setChannel(savedChannel);

        channelSnapshotRepository.save(snap);
        System.out.println(">>> SNAPSHOT SAVED");
    }
}
