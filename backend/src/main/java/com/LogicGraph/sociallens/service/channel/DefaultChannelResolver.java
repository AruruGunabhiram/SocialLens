package com.LogicGraph.sociallens.service.channel;

import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DefaultChannelResolver implements ChannelResolver {

    // UCxxxxxxxxxxxxxxxxxxxxxx (usually 24 chars after UC)
    private static final Pattern CHANNEL_ID_PATTERN = Pattern.compile("^(UC[a-zA-Z0-9_-]{20,})$");
    private static final Pattern URL_CHANNEL_ID_PATTERN =
            Pattern.compile("youtube\\.com/channel/(UC[a-zA-Z0-9_-]{20,})");

    private static final Pattern HANDLE_PATTERN = Pattern.compile("^@?[A-Za-z0-9._-]{3,}$");
    private static final Pattern URL_HANDLE_PATTERN =
            Pattern.compile("youtube\\.com/@([A-Za-z0-9._-]{3,})");

    @Override
    public ResolvedChannelIdentifier resolve(String rawInput) {
        if (rawInput == null) throw new IllegalArgumentException("Channel identifier is required.");

        String input = rawInput.trim();

        // 1) URL with /channel/UC...
        Matcher m1 = URL_CHANNEL_ID_PATTERN.matcher(input);
        if (m1.find()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.CHANNEL_ID, m1.group(1));
        }

        // 2) URL with /@handle
        Matcher m2 = URL_HANDLE_PATTERN.matcher(input);
        if (m2.find()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.HANDLE, m2.group(1));
        }

        // 3) raw UC...
        if (CHANNEL_ID_PATTERN.matcher(input).matches()) {
            return new ResolvedChannelIdentifier(ChannelIdentifierType.CHANNEL_ID, input);
        }

        // 4) raw handle: "@GoogleDevelopers" OR "GoogleDevelopers"
        if (HANDLE_PATTERN.matcher(input).matches()) {
            String handle = input.startsWith("@") ? input.substring(1) : input;
            return new ResolvedChannelIdentifier(ChannelIdentifierType.HANDLE, handle);
        }

        throw new IllegalArgumentException("Unrecognized YouTube channel identifier: " + rawInput);
    }
}
