package com.LogicGraph.sociallens.service.resolver;

import com.LogicGraph.sociallens.dto.youtube.ChannelSummaryDto;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.service.YouTubeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DefaultChannelResolver implements ChannelResolver {

    // youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxxxx
    private static final Pattern URL_CHANNEL_ID =
            Pattern.compile("youtube\\.com/channel/(UC[A-Za-z0-9_-]{22})");

    // youtube.com/@handle
    private static final Pattern URL_HANDLE =
            Pattern.compile("youtube\\.com/@([A-Za-z0-9._-]+)");

    // youtube.com/c/slug  or  youtube.com/user/slug
    private static final Pattern URL_CUSTOM =
            Pattern.compile("youtube\\.com/(?:c|user)/([^/?&#]+)");

    // youtube.com/watch?v=VIDEO_ID  (or &v=)
    private static final Pattern URL_WATCH =
            Pattern.compile("[?&]v=([A-Za-z0-9_-]{11})");

    private final YouTubeService youTubeService;
    private final YouTubeChannelRepository channelRepository;

    public DefaultChannelResolver(YouTubeService youTubeService,
                                  YouTubeChannelRepository channelRepository) {
        this.youTubeService = youTubeService;
        this.channelRepository = channelRepository;
    }

    // -----------------------------------------------------------------------
    // resolve() — pure detection, no I/O
    // -----------------------------------------------------------------------

    @Override
    public ResolvedChannelIdentifier resolve(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Channel identifier must not be blank.");
        }

        String raw = input.trim();

        // 1. Raw channel ID: starts with "UC" and exactly 24 chars
        if (raw.startsWith("UC") && raw.length() == 24 && !raw.contains("/")) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.CHANNEL_ID, raw, raw);
        }

        // 2. URL containing /channel/UC...
        Matcher m = URL_CHANNEL_ID.matcher(raw);
        if (m.find()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.CHANNEL_ID, raw, m.group(1));
        }

        // 3. URL containing /@handle
        m = URL_HANDLE.matcher(raw);
        if (m.find()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.HANDLE, raw, m.group(1));
        }

        // 4. URL containing /c/ or /user/
        m = URL_CUSTOM.matcher(raw);
        if (m.find()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.CUSTOM_URL, raw, m.group(1));
        }

        // 5. Watch URL: youtube.com/watch?v=...
        if (raw.contains("youtube.com/watch")) {
            m = URL_WATCH.matcher(raw);
            if (m.find()) {
                return new ResolvedChannelIdentifier(ChannelIdentifierType.VIDEO_URL, raw, m.group(1));
            }
        }

        // 6. Raw handle with leading @
        if (raw.startsWith("@")) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.HANDLE, raw, raw.substring(1));
        }

        // 7. Default: treat as handle
        return new ResolvedChannelIdentifier(ChannelIdentifierType.HANDLE, raw, raw);
    }

    // -----------------------------------------------------------------------
    // resolveToChannel() — resolve + API fetch + DB upsert
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public YouTubeChannel resolveToChannel(String input) {
        ResolvedChannelIdentifier resolved = resolve(input);

        ChannelSummaryDto dto = switch (resolved.type()) {
            case CHANNEL_ID -> youTubeService.getChannelSummaryByChannelId(resolved.resolvedChannelId());
            case HANDLE     -> youTubeService.getChannelSummaryByHandle(resolved.resolvedChannelId());
            case CUSTOM_URL -> youTubeService.getChannelSummaryByUsername(resolved.resolvedChannelId());
            case VIDEO_URL  -> youTubeService.getChannelSummaryFromVideoId(resolved.resolvedChannelId());
        };

        YouTubeChannel channel = channelRepository
                .findByChannelId(dto.channelId())
                .orElseGet(YouTubeChannel::new);

        channel.setChannelId(dto.channelId());
        channel.setTitle(dto.title());
        channel.setDescription(dto.description());
        channel.setSubscriberCount(dto.subscriberCount());
        channel.setViewCount(dto.viewCount());
        channel.setVideoCount(dto.videoCount());

        return channelRepository.save(channel);
    }
}
