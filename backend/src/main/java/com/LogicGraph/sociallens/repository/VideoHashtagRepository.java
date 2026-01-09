package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.VideoHashtag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoHashtagRepository
        extends JpaRepository<VideoHashtag, Long> {
}
