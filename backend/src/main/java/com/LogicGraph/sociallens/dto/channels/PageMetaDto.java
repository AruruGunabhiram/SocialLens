package com.LogicGraph.sociallens.dto.channels;

public class PageMetaDto {

    public int page;
    public int size;
    public long totalItems;
    public int totalPages;

    public PageMetaDto(int page, int size, long totalItems, int totalPages) {
        this.page = page;
        this.size = size;
        this.totalItems = totalItems;
        this.totalPages = totalPages;
    }
}
