package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.OAuthStateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuthStateCleanupJobTest {

    @Mock private OAuthStateRepository oAuthStateRepository;

    private OAuthStateCleanupJob job;

    @BeforeEach
    void setUp() {
        job = new OAuthStateCleanupJob(oAuthStateRepository);
    }

    // -------------------------------------------------------------------------

    /**
     * Normal case: repository deletes nothing — no log, no error.
     */
    @Test
    void cleanupExpiredStates_zeroRowsDeleted_completesQuietly() {
        when(oAuthStateRepository.deleteExpiredAndUsed(any(Instant.class))).thenReturn(0);

        assertThatCode(() -> job.cleanupExpiredStates()).doesNotThrowAnyException();
        verify(oAuthStateRepository).deleteExpiredAndUsed(any(Instant.class));
    }

    /**
     * Deletion case: repository deletes rows — job passes a timestamp that is
     * >= before the call and <= after, ensuring we are not passing a hardcoded or
     * stale Instant.
     */
    @Test
    void cleanupExpiredStates_rowsDeleted_passesCurrentInstantToRepository() {
        when(oAuthStateRepository.deleteExpiredAndUsed(any(Instant.class))).thenReturn(5);

        Instant before = Instant.now();
        job.cleanupExpiredStates();
        Instant after = Instant.now();

        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
        verify(oAuthStateRepository).deleteExpiredAndUsed(captor.capture());

        Instant passed = captor.getValue();
        assertThat(passed).isAfterOrEqualTo(before);
        assertThat(passed).isBeforeOrEqualTo(after);
    }

    /**
     * Repository error propagates — the scheduled runner's error handler will
     * log it; the job itself should not swallow it.
     */
    @Test
    void cleanupExpiredStates_repositoryThrows_exceptionPropagates() {
        when(oAuthStateRepository.deleteExpiredAndUsed(any(Instant.class)))
                .thenThrow(new RuntimeException("DB connection failed"));

        assertThatThrownBy(() -> job.cleanupExpiredStates())
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB connection failed");
    }
}
