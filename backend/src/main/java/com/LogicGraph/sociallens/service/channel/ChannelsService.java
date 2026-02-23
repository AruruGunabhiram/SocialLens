package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.ChannelDetailDto;
import com.LogicGraph.sociallens.dto.channels.ChannelListItemDto;

import java.util.List;

public interface ChannelsService {

    /**
     * Returns channels sorted by title ascending (nulls last).
     *
     * @param includeInactive when true, inactive channels are included; otherwise only active ones.
     */
    List<ChannelListItemDto> listChannels(boolean includeInactive);

    /**
     * Returns the full detail for a single channel.
     *
     * @throws org.springframework.web.server.ResponseStatusException 404 if not found.
     */
    ChannelDetailDto getChannelById(Long channelDbId);
}
