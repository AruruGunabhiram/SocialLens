package com.LogicGraph.sociallens.exception;

public class ConnectedAccountNotFoundException extends RuntimeException {
    public ConnectedAccountNotFoundException(String userId) {
        super("Connected account not found for user: " + userId);
    }
}
