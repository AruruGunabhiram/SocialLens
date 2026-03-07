package com.LogicGraph.sociallens.exception;

import com.LogicGraph.sociallens.dto.error.ErrorResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ChannelNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleChannelNotFound(ChannelNotFoundException ex) {
        log.error("ChannelNotFoundException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage(), "CHANNEL_NOT_FOUND", Instant.now()));
    }

    @ExceptionHandler(VideoNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleVideoNotFound(VideoNotFoundException ex) {
        log.error("VideoNotFoundException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage(), "VIDEO_NOT_FOUND", Instant.now()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponseDto> handleRateLimitExceeded(RateLimitExceededException ex) {
        log.error("RateLimitExceededException: {}", ex.getMessage(), ex);
        HttpHeaders headers = new HttpHeaders();
        headers.set("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .headers(headers)
                .body(new ErrorResponseDto(ex.getMessage(), "RATE_LIMIT_EXCEEDED", Instant.now()));
    }

    @ExceptionHandler(OAuthStateInvalidException.class)
    public ResponseEntity<ErrorResponseDto> handleOAuthStateInvalid(OAuthStateInvalidException ex) {
        log.error("OAuthStateInvalidException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(ex.getMessage(), "OAUTH_STATE_INVALID", Instant.now()));
    }

    @ExceptionHandler(TokenRefreshFailedException.class)
    public ResponseEntity<ErrorResponseDto> handleTokenRefreshFailed(TokenRefreshFailedException ex) {
        log.error("TokenRefreshFailedException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponseDto(ex.getMessage(), "TOKEN_REFRESH_FAILED", Instant.now()));
    }

    @ExceptionHandler(SyncAlreadyInProgressException.class)
    public ResponseEntity<ErrorResponseDto> handleSyncAlreadyInProgress(SyncAlreadyInProgressException ex) {
        log.error("SyncAlreadyInProgressException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto(ex.getMessage(), "SYNC_IN_PROGRESS", Instant.now()));
    }

    @ExceptionHandler(InsufficientApiQuotaException.class)
    public ResponseEntity<ErrorResponseDto> handleInsufficientQuota(InsufficientApiQuotaException ex) {
        log.error("InsufficientApiQuotaException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponseDto(ex.getMessage(), "QUOTA_INSUFFICIENT", Instant.now()));
    }

    @ExceptionHandler(ConnectedAccountNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleConnectedAccountNotFound(ConnectedAccountNotFoundException ex) {
        log.error("ConnectedAccountNotFoundException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage(), "ACCOUNT_NOT_FOUND", Instant.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidation(MethodArgumentNotValidException ex) {
        log.error("MethodArgumentNotValidException: {}", ex.getMessage(), ex);
        String fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        String message = fieldErrors.isEmpty() ? "Validation failed" : "Validation failed: " + fieldErrors;
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto(message, "VALIDATION_FAILED", Instant.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDto("An unexpected error occurred", "INTERNAL_ERROR", Instant.now()));
    }
}
