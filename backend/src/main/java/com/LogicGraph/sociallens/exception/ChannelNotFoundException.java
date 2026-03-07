package com.LogicGraph.sociallens.exception;

public class ChannelNotFoundException extends RuntimeException {
    public ChannelNotFoundException(String identifier) {
        super("Channel not found: " + identifier);
    }
}
