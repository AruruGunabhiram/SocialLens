// Changelog: Add channel metric fields to persist and snapshot counts from YouTube API.
package com.LogicGraph.sociallens.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import com.LogicGraph.sociallens.enums.RefreshStatus;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import lombok.NoArgsConstructor;

@NoArgsConstructor
@Entity
@Table(name = "youtube_channel", indexes = {
        @Index(name = "idx_youtube_channel_channelId", columnList = "channelId"),
        @Index(name = "idx_youtube_channel_handle", columnList = "handle")
})
@Getter
@Setter
public class YouTubeChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String channelId;

    private String handle;
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Instant publishedAt;

    private String country;
    private String thumbnailUrl;

    // Cursor for incremental video sync
    private Instant lastVideoSyncAt;

    // Observability for the overall daily refresh
    private Instant lastSuccessfulRefreshAt;

    @Enumerated(EnumType.STRING)
    private RefreshStatus lastRefreshStatus = RefreshStatus.NEVER_RUN;

    private String lastRefreshError;

    // Latest metrics pulled from the Data API; mirrored into daily snapshots.
    private Long subscriberCount;
    private Long viewCount;
    private Long videoCount;

    // default to true
    private boolean active = true;

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

}
