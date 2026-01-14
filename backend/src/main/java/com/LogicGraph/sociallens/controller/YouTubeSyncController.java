package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.service.YouTubeSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/youtube")
public class YouTubeSyncController {

    private final YouTubeSyncService syncService;

    public YouTubeSyncController(YouTubeSyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/sync")
public ResponseEntity<?> sync(@RequestBody Map<String, String> body) {
    String channelId = body.get("channelId");

    if (channelId == null || channelId.isBlank()) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "channelId is required"));
    }

    syncService.syncChannelByChannelId(channelId.trim());
    return ResponseEntity.ok(Map.of("message", "Synced channel successfully"));
}


}
