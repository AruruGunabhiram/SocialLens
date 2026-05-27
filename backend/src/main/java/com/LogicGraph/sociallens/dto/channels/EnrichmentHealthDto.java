package com.LogicGraph.sociallens.dto.channels;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Enrichment health summary for a single channel.
 *
 * <p>All counts are scoped to <em>active</em> videos only — inactive rows (deleted / private)
 * are excluded so the numbers reflect what the user can actually see in the video table.
 *
 * <p>Fields:
 * <ul>
 *   <li>{@code totalVideos}       – active videos stored in SocialLens for this channel</li>
 *   <li>{@code enrichedVideos}    – subset that have a non-blank title (metadata enriched)</li>
 *   <li>{@code missingMetadata}   – subset with a null title (discovered but not yet enriched)</li>
 *   <li>{@code lastRefreshAt}     – when the last successful refresh completed; null if never</li>
 *   <li>{@code lastRefreshStatus} – SUCCESS | PARTIAL | FAILED | NEVER_RUN</li>
 *   <li>{@code lastRefreshError}  – error detail from the most recent FAILED or PARTIAL run</li>
 * </ul>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EnrichmentHealthDto {

    public long totalVideos;
    public long enrichedVideos;
    public long missingMetadata;
    public Instant lastRefreshAt;
    public String lastRefreshStatus;
    public String lastRefreshError;

    public EnrichmentHealthDto() {}
}
