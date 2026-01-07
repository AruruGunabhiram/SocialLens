package com.LogicGraph.sociallens.service.channel;

public interface ChannelResolver {
    ResolvedChannelIdentifier resolve(String rawInput);
}
