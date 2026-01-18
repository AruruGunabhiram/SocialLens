package com.LogicGraph.sociallens.dto.youtube;

import jakarta.validation.constraints.NotBlank;

public class YouTubeSyncRequestDto {

    @NotBlank(message = "identifier is required")
    public String identifier;     // channel URL / handle / channelId

    public Integer maxPages;      // future use (videos)
    public Integer pageSize;      // future use (videos)
    public Boolean forceRefresh;  // future use

}
