package com.LogicGraph.sociallens.exception;

/** Thrown when a refresh is already in progress for the same channel. Maps to HTTP 409. */
public class RefreshAlreadyRunningException extends RuntimeException {

    private final Long channelDbId;

    public RefreshAlreadyRunningException(Long channelDbId) {
        super("Refresh already in progress for channelDbId=" + channelDbId);
        this.channelDbId = channelDbId;
    }

    public Long getChannelDbId() {
        return channelDbId;
    }
}
