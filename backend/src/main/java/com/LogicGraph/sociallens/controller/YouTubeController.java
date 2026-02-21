package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.service.YouTubeService;
import com.LogicGraph.sociallens.service.channel.ChannelResolver;
import com.LogicGraph.sociallens.service.channel.ResolvedChannelIdentifier;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/youtube")
public class YouTubeController {

    private final YouTubeService youTubeService;
    private final ChannelResolver channelResolver;

    public YouTubeController(YouTubeService youTubeService, ChannelResolver channelResolver) {
        this.youTubeService = youTubeService;
        this.channelResolver = channelResolver;
    }

  
    @GetMapping("/channel/{identifier}")
    public ChannelSummaryDto getChannel(@PathVariable String identifier) {
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        return youTubeService.getChannelSummary(resolved);
    }


    @GetMapping("/channel")
    public ChannelSummaryDto getChannelByQuery(@RequestParam("q") String identifier) {
        ResolvedChannelIdentifier resolved = channelResolver.resolve(identifier);
        return youTubeService.getChannelSummary(resolved);
    }
}