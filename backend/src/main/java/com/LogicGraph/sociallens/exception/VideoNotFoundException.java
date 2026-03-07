package com.LogicGraph.sociallens.exception;

public class VideoNotFoundException extends RuntimeException {
    public VideoNotFoundException(String videoId) {
        super("Video not found: " + videoId);
    }
}
