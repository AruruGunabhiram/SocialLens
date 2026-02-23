package com.LogicGraph.sociallens.dto.channels;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Maps the public sort key names exposed in the API to the actual JPA entity field names.
 * Allowed values: publishedAt | views | likes | comments | title
 */
public enum VideoSortKey {

    publishedAt("publishedAt"),
    views("viewCount"),
    likes("likeCount"),
    comments("commentCount"),
    title("title");

    /** The field name on {@code YouTubeVideo} used in {@code Sort.by(...)}. */
    public final String entityField;

    VideoSortKey(String entityField) {
        this.entityField = entityField;
    }

    /** Case-insensitive parse; returns null if the value is not a known key. */
    public static VideoSortKey fromString(String value) {
        if (value == null) return null;
        for (VideoSortKey key : values()) {
            if (key.name().equalsIgnoreCase(value)) return key;
        }
        return null;
    }

    /** Comma-separated list of allowed values for error messages. */
    public static String allowedValues() {
        return Arrays.stream(values())
                .map(Enum::name)
                .collect(Collectors.joining(", "));
    }
}
