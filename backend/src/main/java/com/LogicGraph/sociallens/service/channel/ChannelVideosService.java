package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.VideoSortKey;
import com.LogicGraph.sociallens.dto.channels.VideosPageResponseDto;
import org.springframework.data.domain.Sort;

public interface ChannelVideosService {

    /**
     * Returns a paginated, optionally filtered list of videos for the given channel.
     *
     * @param channelDbId the database PK of the channel; 404 thrown if not found.
     * @param q           optional title search (blank treated as absent).
     * @param sort        sort key (maps to entity field); defaults to publishedAt.
     * @param dir         sort direction; defaults to DESC.
     * @param page        zero-based page index.
     * @param size        page size, clamped to [1, 100].
     */
    VideosPageResponseDto getVideos(Long channelDbId,
                                    String q,
                                    VideoSortKey sort,
                                    Sort.Direction dir,
                                    int page,
                                    int size);
}
