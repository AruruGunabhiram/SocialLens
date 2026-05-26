package com.LogicGraph.sociallens.dto.youtube;

import java.util.List;

public class YouTubeSyncResponseDto {

    public String identifier;

    // Channel metadata from DB
    public Long channelDbId;
    public String channelId;
    public String title;

    public Resolved resolved;
    public Result result;
    public Timing timing;
    public List<String> warnings;

    public static class Resolved {
        public String channelId;
        public String resolvedFrom;
        public String normalizedInput;
    }

    public static class Result {
        public int videosFetched;
        public int videosSaved;
        public int videosUpdated;
        public int pagesFetched;
        public int pageSize;
        /** Videos that received full metadata from the YouTube API during this sync. */
        public int videosEnriched;
        /** Number of API batches that failed during enrichment (each batch covers up to 50 videos). */
        public int enrichmentErrors;
    }

    public static class Timing {
        public String startedAt;
        public String finishedAt;
        public long durationMs;
    }
}
