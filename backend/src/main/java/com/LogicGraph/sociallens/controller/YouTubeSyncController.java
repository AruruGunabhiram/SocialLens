package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncRequestDto;
import com.LogicGraph.sociallens.dto.youtube.YouTubeSyncResponseDto;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/youtube")
public class YouTubeSyncController {

    private final YouTubeSyncService syncService;

    public YouTubeSyncController(YouTubeSyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/sync")
    public YouTubeSyncResponseDto sync(@Valid @RequestBody YouTubeSyncRequestDto request) {
        return syncService.syncChannelOnly(request.getIdentifier());
    }
}
