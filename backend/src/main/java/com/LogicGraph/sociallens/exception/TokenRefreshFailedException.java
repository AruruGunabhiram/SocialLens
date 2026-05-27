package com.LogicGraph.sociallens.exception;

public class TokenRefreshFailedException extends RuntimeException {
    public TokenRefreshFailedException(String accountId, String reason) {
        super("Token refresh failed for account " + accountId + ": " + reason);
    }

    public TokenRefreshFailedException(String accountId, String reason, Throwable cause) {
        super("Token refresh failed for account " + accountId + ": " + reason, cause);
    }
}
