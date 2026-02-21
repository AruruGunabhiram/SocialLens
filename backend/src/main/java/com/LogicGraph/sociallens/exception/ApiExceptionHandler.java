package com.LogicGraph.sociallens.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {

    // ==============================================
    // Domain-specific exceptions
    // ==============================================

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex, HttpServletRequest req) {
        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                "NOT_FOUND",
                Map.of("path", req.getRequestURI())
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitException ex, HttpServletRequest req) {
        ErrorResponse error = new ErrorResponse(
                ex.getMessage(),
                "RATE_LIMIT_EXCEEDED",
                Map.of("path", req.getRequestURI())
        );
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    // ==============================================
    // Request validation exceptions (400 Bad Request)
    // ==============================================

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest req) {

        String message = String.format("Missing required parameter: %s", ex.getParameterName());

        Map<String, Object> details = new HashMap<>();
        details.put("parameter", ex.getParameterName());
        details.put("expectedType", ex.getParameterType());
        details.put("path", req.getRequestURI());

        ErrorResponse error = new ErrorResponse(message, "MISSING_PARAMETER", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            HttpServletRequest req) {

        String expectedType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = String.format(
                "Invalid parameter type: %s must be a %s",
                ex.getName(),
                getReadableTypeName(expectedType)
        );

        Map<String, Object> details = new HashMap<>();
        details.put("parameter", ex.getName());
        details.put("providedValue", ex.getValue());
        details.put("expectedType", expectedType);
        details.put("path", req.getRequestURI());

        ErrorResponse error = new ErrorResponse(message, "INVALID_PARAMETER_TYPE", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest req) {

        String violations = ex.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));

        String message = "Validation failed: " + violations;

        Map<String, Object> details = new HashMap<>();
        details.put("violations", ex.getConstraintViolations().stream()
                .map(v -> Map.of(
                        "field", v.getPropertyPath().toString(),
                        "message", v.getMessage(),
                        "invalidValue", v.getInvalidValue() != null ? v.getInvalidValue().toString() : "null"
                ))
                .collect(Collectors.toList()));
        details.put("path", req.getRequestURI());

        ErrorResponse error = new ErrorResponse(message, "VALIDATION_FAILED", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpServletRequest req) {

        String message = "Invalid request body";

        // Try to extract more specific error message
        Throwable cause = ex.getCause();
        if (cause != null) {
            String causeMessage = cause.getMessage();
            if (causeMessage != null && !causeMessage.isEmpty()) {
                // Extract JSON parsing errors
                if (causeMessage.contains("Unexpected character")) {
                    message = "Invalid JSON format in request body";
                } else if (causeMessage.contains("Cannot deserialize")) {
                    message = "Cannot parse request body: invalid field type or format";
                } else if (causeMessage.contains("Unrecognized field")) {
                    message = "Unknown field in request body";
                }
            }
        }

        Map<String, Object> details = new HashMap<>();
        details.put("path", req.getRequestURI());
        if (cause != null && cause.getMessage() != null) {
            details.put("parseError", extractSimpleParseError(cause.getMessage()));
        }

        ErrorResponse error = new ErrorResponse(message, "INVALID_REQUEST_BODY", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // ==============================================
    // Generic exception handler (fallback)
    // ==============================================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest req) {

        String message = "An unexpected error occurred";

        Map<String, Object> details = new HashMap<>();
        details.put("path", req.getRequestURI());
        details.put("exceptionType", ex.getClass().getSimpleName());

        ErrorResponse error = new ErrorResponse(message, "INTERNAL_ERROR", details);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    // ==============================================
    // Helper methods
    // ==============================================

    private String getReadableTypeName(String typeName) {
        return switch (typeName) {
            case "Long", "long" -> "number";
            case "Integer", "int" -> "number";
            case "Double", "double" -> "number";
            case "Boolean", "boolean" -> "boolean";
            case "String" -> "string";
            default -> typeName.toLowerCase();
        };
    }

    private String extractSimpleParseError(String fullMessage) {
        // Extract the first line or first 150 characters of the error
        if (fullMessage.length() > 150) {
            int newlineIndex = fullMessage.indexOf('\n');
            if (newlineIndex > 0 && newlineIndex < 150) {
                return fullMessage.substring(0, newlineIndex);
            }
            return fullMessage.substring(0, 150) + "...";
        }
        return fullMessage;
    }
}
