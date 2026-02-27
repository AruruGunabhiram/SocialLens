package com.LogicGraph.sociallens.service.channel;

import com.LogicGraph.sociallens.dto.channels.PageMetaDto;
import com.LogicGraph.sociallens.dto.channels.VideoRowDto;
import com.LogicGraph.sociallens.dto.channels.VideoSortKey;
import com.LogicGraph.sociallens.dto.channels.VideosPageResponseDto;
import com.LogicGraph.sociallens.entity.YouTubeVideo;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.repository.YouTubeVideoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChannelVideosServiceImpl implements ChannelVideosService {

    private final YouTubeChannelRepository youTubeChannelRepository;
    private final YouTubeVideoRepository youTubeVideoRepository;

    public ChannelVideosServiceImpl(YouTubeChannelRepository youTubeChannelRepository,
                                    YouTubeVideoRepository youTubeVideoRepository) {
        this.youTubeChannelRepository = youTubeChannelRepository;
        this.youTubeVideoRepository = youTubeVideoRepository;
    }

    @Override
    public VideosPageResponseDto getVideos(Long channelDbId,
                                           String q,
                                           VideoSortKey sort,
                                           Sort.Direction dir,
                                           int page,
                                           int size) {
        if (!youTubeChannelRepository.existsById(channelDbId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Channel not found with id: " + channelDbId);
        }

        int clampedSize = Math.max(1, Math.min(100, size));
        // Nulls always sort last regardless of direction; secondary sort by id desc for stable pagination.
        Sort.Order primary = new Sort.Order(dir, sort.entityField, Sort.NullHandling.NULLS_LAST);
        Sort springSort = Sort.by(primary).and(Sort.by(Sort.Direction.DESC, "id"));
        Pageable pageable = PageRequest.of(page, clampedSize, springSort);

        String trimmedQ = (q == null || q.isBlank()) ? null : q.strip();
        Page<YouTubeVideo> result = (trimmedQ == null)
                ? youTubeVideoRepository.findByChannel_Id(channelDbId, pageable)
                : youTubeVideoRepository.searchByChannelAndTitleOrVideoId(channelDbId, trimmedQ, pageable);

        List<VideoRowDto> items = result.getContent().stream()
                .map(this::toVideoRowDto)
                .collect(Collectors.toList());

        PageMetaDto meta = new PageMetaDto(page, clampedSize, result.getTotalElements(), result.getTotalPages());
        return new VideosPageResponseDto(items, meta);
    }

    private VideoRowDto toVideoRowDto(YouTubeVideo v) {
        VideoRowDto dto = new VideoRowDto();
        dto.id = v.getId();
        dto.videoId = v.getVideoId();
        dto.title = v.getTitle();
        dto.publishedAt = v.getPublishedAt();
        dto.thumbnailUrl = v.getThumbnailUrl();
        dto.viewCount = v.getViewCount();
        dto.likeCount = v.getLikeCount();
        dto.commentCount = v.getCommentCount();
        return dto;
    }
}
