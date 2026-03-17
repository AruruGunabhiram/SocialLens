package com.LogicGraph.sociallens.service.resolver;

/**
 * Immutable result of parsing/detecting a channel identifier string.
 *
 * @param type              what kind of identifier was detected
 * @param rawValue          the original, untouched input string
 * @param resolvedChannelId the canonical value extracted for this type
 *                          (channel ID for CHANNEL_ID, handle slug for HANDLE,
 *                          custom-URL slug for CUSTOM_URL, video ID for VIDEO_URL)
 */
public record ResolvedChannelIdentifier(
        ChannelIdentifierType type,
        String rawValue,
        String resolvedChannelId) {
}
