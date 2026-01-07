package com.LogicGraph.sociallens.service.channel;

public class ResolvedChannelIdentifier {
    private final ChannelIdentifierType type;
    private final String value;

    public ResolvedChannelIdentifier(ChannelIdentifierType type, String value) {
        this.type = type;
        this.value = value;
    }

    public ChannelIdentifierType getType() { return type; }
    public String getValue() { return value; }
}
