package com.LogicGraph.sociallens.exception;

/**
 * Thrown when an upstream analytics API (YouTube Analytics, YouTube Data API)
 * returns an error or an unexpected response. Maps to 502 Bad Gateway.
 */
public class UpstreamAnalyticsException extends RuntimeException {

    public UpstreamAnalyticsException(String message) {
        super(message);
    }

    public UpstreamAnalyticsException(String message, Throwable cause) {
        super(message, cause);
    }
}
