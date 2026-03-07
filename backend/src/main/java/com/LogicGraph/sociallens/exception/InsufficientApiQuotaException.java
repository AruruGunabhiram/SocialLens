package com.LogicGraph.sociallens.exception;

public class InsufficientApiQuotaException extends RuntimeException {
    private final int required;
    private final int available;

    public InsufficientApiQuotaException(int required, int available) {
        super("Insufficient API quota: required " + required + ", available " + available);
        this.required = required;
        this.available = available;
    }

    public int getRequired() {
        return required;
    }

    public int getAvailable() {
        return available;
    }
}
