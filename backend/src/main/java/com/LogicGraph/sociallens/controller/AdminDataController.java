package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.repository.ChannelMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.VideoMetricsSnapshotRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Administrative data management endpoints.
 *
 * WARNING: All operations here are destructive and irreversible.
 * MVP  -  no auth guards; protect behind a real auth layer before
 * exposing to untrusted users.
 */
@RestController
@RequestMapping("/api/v1/admin/data")
public class AdminDataController {

    private final ChannelMetricsSnapshotRepository channelSnapshotRepo;
    private final VideoMetricsSnapshotRepository videoSnapshotRepo;
    private final YouTubeVideoRepository videoRepo;

    public AdminDataController(
            ChannelMetricsSnapshotRepository channelSnapshotRepo,
            VideoMetricsSnapshotRepository videoSnapshotRepo,
            YouTubeVideoRepository videoRepo) {
        this.channelSnapshotRepo = channelSnapshotRepo;
        this.videoSnapshotRepo = videoSnapshotRepo;
        this.videoRepo = videoRepo;
    }

    /**
     * POST /api/v1/admin/data/clear
     *
     * Deletes all stored analytics snapshots and indexed video records.
     * YouTubeChannel tracking rows are preserved.
     *
     * Deletion order respects FK constraints:
     *   1. VideoMetricsSnapshot  (references YouTubeVideo)
     *   2. YouTubeVideo          (references YouTubeChannel)
     *   3. ChannelMetricsSnapshot (references YouTubeChannel)
     */
    @PostMapping("/clear")
    @Transactional
    public ResponseEntity<Map<String, Object>> clearAllData() {
        long videoSnapshots = videoSnapshotRepo.count();
        long videos = videoRepo.count();
        long channelSnapshots = channelSnapshotRepo.count();

        videoSnapshotRepo.deleteAllInBatch();
        videoRepo.deleteAllInBatch();
        channelSnapshotRepo.deleteAllInBatch();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cleared", true);
        body.put("videoSnapshotsDeleted", videoSnapshots);
        body.put("videosDeleted", videos);
        body.put("channelSnapshotsDeleted", channelSnapshots);
        return ResponseEntity.ok(body);
    }
}
