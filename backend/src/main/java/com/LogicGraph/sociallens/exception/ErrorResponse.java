package com.LogicGraph.sociallens.exception;

import java.time.Instant;
import java.util.Map;

public class ErrorResponse {
    private final String message;
    private final String code;
    private final Map<String, Object> details;
    private final Instant timestamp;

    // Constructor for backward compatibility
    public ErrorResponse(String message) {
        this(message, null, null);
    }

    public ErrorResponse(String message, String code) {
        this(message, code, null);
    }

    public ErrorResponse(String message, String code, Map<String, Object> details) {
        this.message = message;
        this.code = code;
        this.details = details;
        this.timestamp = Instant.now();
    }

    public String getMessage() {
        return message;
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
