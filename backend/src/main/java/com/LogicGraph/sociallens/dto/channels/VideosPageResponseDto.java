package com.LogicGraph.sociallens.dto.channels;

import java.util.List;

public class VideosPageResponseDto {

    public List<VideoRowDto> items;
    public PageMetaDto page;

    public VideosPageResponseDto(List<VideoRowDto> items, PageMetaDto page) {
        this.items = items;
        this.page = page;
    }
}
