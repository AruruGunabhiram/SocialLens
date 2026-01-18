package com.LogicGraph.sociallens.dto.youtube;

public class YouTubeSyncRequestDto {
    public String identifier;     // channel URL / handle / channelId
    public Integer maxPages;      // how much to fetch
    public Integer pageSize;      // videos per page
    public Boolean forceRefresh;  // re-sync existing data
}
