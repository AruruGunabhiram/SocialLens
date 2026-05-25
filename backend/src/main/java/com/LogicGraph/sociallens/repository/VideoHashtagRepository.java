package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoHashtag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoHashtagRepository
        extends JpaRepository<VideoHashtag, Long> {

        /** Deletes all hashtag links for videos belonging to a channel. */
        long deleteByVideo_Channel_Id(Long channelDbId);
}
