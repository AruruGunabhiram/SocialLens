package com.LogicGraph.sociallens.service;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class YouTubeSyncService {

    private final YouTubeService youTubeService;
    private final YouTubeChannelRepository channelRepository;
    private final ChannelMetricsSnapshotRepository channelSnapshotRepository;

    public YouTubeSyncService(
            YouTubeService youTubeService,
            YouTubeChannelRepository channelRepository,
            ChannelMetricsSnapshotRepository channelSnapshotRepository
    ) {
        this.youTubeService = youTubeService;
        this.channelRepository = channelRepository;
        this.channelSnapshotRepository = channelSnapshotRepository;
    }

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
