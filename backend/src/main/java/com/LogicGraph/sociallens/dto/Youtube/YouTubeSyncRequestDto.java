package com.LogicGraph.sociallens.dto.youtube;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class YouTubeSyncRequestDto {

    @NotBlank(message = "identifier is required")
    private String identifier; // channel URL / handle / channelId

    private Integer maxPages; // optional for now
    private Integer pageSize; // optional for now

    private Boolean forceRefresh = false;
}
