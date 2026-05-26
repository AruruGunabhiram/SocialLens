package com.LogicGraph.sociallens.service.oauth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleTokenRevokerTest {

    @Mock
    private RestTemplate restTemplate;

    private GoogleTokenRevoker revoker;

    @BeforeEach
    void setUp() {
        revoker = new GoogleTokenRevoker(restTemplate);
    }

    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------

    @Test
    void revokeQuietly_success_callsGoogleRevokeEndpoint() {
        when(restTemplate.exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenReturn(ResponseEntity.ok().build());

        assertThatNoException().isThrownBy(() -> revoker.revokeQuietly("some-refresh-token"));

        verify(restTemplate, times(1)).exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class));
    }

    @Test
    void revokeQuietly_success_requestBodyContainsToken() {
        when(restTemplate.exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenReturn(ResponseEntity.ok().build());

        revoker.revokeQuietly("my-secret-refresh-token");

        ArgumentCaptor<HttpEntity<?>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                captor.capture(),
                eq(Void.class));

        HttpEntity<?> captured = captor.getValue();
        // Verify content-type is form-encoded
        assertThat(captured.getHeaders().getContentType())
                .isEqualTo(MediaType.APPLICATION_FORM_URLENCODED);
        // Verify the token is in the body (without logging its value in assertions)
        assertThat(captured.getBody().toString()).contains("token");
    }

    // -------------------------------------------------------------------------
    // Failure cases — must never propagate exceptions
    // -------------------------------------------------------------------------

    @Test
    void revokeQuietly_httpError_doesNotThrow() {
        // Google returns 400 when the token is already revoked or invalid
        RestClientResponseException httpEx = new RestClientResponseException(
                "Bad Request", 400, "Bad Request",
                HttpHeaders.EMPTY, "error=invalid_token".getBytes(StandardCharsets.UTF_8),
                StandardCharsets.UTF_8);

        when(restTemplate.exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenThrow(httpEx);

        // Must swallow the exception and not rethrow
        assertThatNoException().isThrownBy(() -> revoker.revokeQuietly("expired-token"));
    }

    @Test
    void revokeQuietly_networkTimeout_doesNotThrow() {
        // Network unreachable — socket timeout wrapped in ResourceAccessException
        when(restTemplate.exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenThrow(new ResourceAccessException("Connection timed out",
                        new SocketTimeoutException("Read timed out")));

        assertThatNoException().isThrownBy(() -> revoker.revokeQuietly("some-token"));
    }

    @Test
    void revokeQuietly_unexpectedRuntimeException_doesNotThrow() {
        when(restTemplate.exchange(
                eq(GoogleTokenRevoker.REVOKE_URL),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(Void.class)))
                .thenThrow(new RuntimeException("Unexpected failure"));

        assertThatNoException().isThrownBy(() -> revoker.revokeQuietly("some-token"));
    }

    // -------------------------------------------------------------------------
    // Edge cases — null / blank token → RestTemplate must never be called
    // -------------------------------------------------------------------------

    @Test
    void revokeQuietly_nullToken_skipsHttpCall() {
        revoker.revokeQuietly(null);
        verifyNoInteractions(restTemplate);
    }

    @Test
    void revokeQuietly_blankToken_skipsHttpCall() {
        revoker.revokeQuietly("   ");
        verifyNoInteractions(restTemplate);
    }

    @Test
    void revokeQuietly_emptyToken_skipsHttpCall() {
        revoker.revokeQuietly("");
        verifyNoInteractions(restTemplate);
    }
}
