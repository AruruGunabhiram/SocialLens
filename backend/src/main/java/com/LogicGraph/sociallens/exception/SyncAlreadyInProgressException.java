package com.LogicGraph.sociallens.exception;

public class SyncAlreadyInProgressException extends RuntimeException {
    public SyncAlreadyInProgressException(String channelId) {
        super("Sync already in progress for channel: " + channelId);
    }
}
