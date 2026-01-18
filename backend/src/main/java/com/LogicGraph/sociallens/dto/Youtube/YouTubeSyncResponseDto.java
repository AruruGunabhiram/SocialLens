package com.LogicGraph.sociallens.dto.youtube;

import java.util.List;

public class YouTubeSyncResponseDto {

    public String identifier;
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
    }

    public static class Timing {
        public String startedAt;
        public String finishedAt;
        public long durationMs;
    }
}
