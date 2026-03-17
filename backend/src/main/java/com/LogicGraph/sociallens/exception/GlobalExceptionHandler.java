package com.LogicGraph.sociallens.exception;

import com.LogicGraph.sociallens.dto.error.ErrorResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(NotFoundException ex, HttpServletRequest request) {
        log.error("NotFoundException: {}", ex.getMessage(), ex);
        Map<String, Object> details = Map.of("path", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage(), "NOT_FOUND", Instant.now(), details));
    }

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

    /**
     * Handles both RateLimitException (no retry info, thrown by YouTubeService)
     * and RateLimitExceededException (with retryAfterSeconds, used for structured limits).
     * Consolidated to eliminate duplicate 429 handlers.
     */
    @ExceptionHandler({RateLimitException.class, RateLimitExceededException.class})
    public ResponseEntity<ErrorResponseDto> handleRateLimit(RuntimeException ex, HttpServletRequest request) {
        log.error("Rate limit exception: {}", ex.getMessage(), ex);
        HttpHeaders headers = new HttpHeaders();
        if (ex instanceof RateLimitExceededException rle && rle.getRetryAfterSeconds() > 0) {
            headers.set("Retry-After", String.valueOf(rle.getRetryAfterSeconds()));
        }
        Map<String, Object> details = Map.of("path", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .headers(headers)
                .body(new ErrorResponseDto(ex.getMessage(), "RATE_LIMIT_EXCEEDED", Instant.now(), details));
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

    /**
     * YouTube Data API quota resets at midnight Pacific Time.
     * Retry-After is set to the number of seconds until that reset.
     */
    @ExceptionHandler(InsufficientApiQuotaException.class)
    public ResponseEntity<ErrorResponseDto> handleInsufficientQuota(InsufficientApiQuotaException ex) {
        log.error("InsufficientApiQuotaException: {}", ex.getMessage(), ex);
        HttpHeaders headers = new HttpHeaders();
        headers.set("Retry-After", String.valueOf(secondsUntilYouTubeQuotaReset()));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .headers(headers)
                .body(new ErrorResponseDto(ex.getMessage(), "QUOTA_INSUFFICIENT", Instant.now()));
    }

    @ExceptionHandler(ConnectedAccountNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleConnectedAccountNotFound(ConnectedAccountNotFoundException ex) {
        log.error("ConnectedAccountNotFoundException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto(ex.getMessage(), "ACCOUNT_NOT_FOUND", Instant.now()));
    }

    /**
     * Catches duplicate-key and unique-constraint violations on insert.
     * Returns 409 instead of 500 so callers can distinguish "already exists" from a real server error.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("DataIntegrityViolationException: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto(
                        "Resource already exists or a unique constraint was violated",
                        "CONFLICT",
                        Instant.now()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponseDto> handleMissingParam(MissingServletRequestParameterException ex) {
        log.error("MissingServletRequestParameterException: {}", ex.getMessage(), ex);
        String name = ex.getParameterName();
        String type = ex.getParameterType();
        Map<String, Object> details = Map.of("parameter", name, "expectedType", type);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto("Missing required parameter: " + name, "MISSING_PARAMETER", Instant.now(), details));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponseDto> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.error("MethodArgumentTypeMismatchException: {}", ex.getMessage(), ex);
        String name = ex.getName();
        String provided = ex.getValue() != null ? ex.getValue().toString() : "null";
        String expected = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        Map<String, Object> details = Map.of("parameter", name, "providedValue", provided, "expectedType", expected);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponseDto("Invalid parameter type: " + name + " must be a number", "INVALID_PARAMETER_TYPE", Instant.now(), details));
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

    /** YouTube API quota resets at midnight Pacific Time. */
    private long secondsUntilYouTubeQuotaReset() {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("America/Los_Angeles"));
        ZonedDateTime midnight = now.toLocalDate().plusDays(1).atStartOfDay(now.getZone());
        return Duration.between(now, midnight).getSeconds();
    }
}
