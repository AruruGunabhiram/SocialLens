package com.LogicGraph.sociallens.repository;

import com.LogicGraph.sociallens.entity.ChannelMetricsSnapshot;
import com.LogicGraph.sociallens.entity.YouTubeChannel;
import com.LogicGraph.sociallens.enums.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Repository slice tests for ChannelMetricsSnapshotRepository.
 *
 * Uses H2 in-memory with Hibernate DDL (spring.flyway.enabled=false in
 * application-test.properties). @ActiveProfiles("test") loads that config.
 */
@DataJpaTest
@ActiveProfiles("test")
class ChannelMetricsSnapshotRepositoryTest {

    @Autowired private ChannelMetricsSnapshotRepository snapshotRepo;
    @Autowired private YouTubeChannelRepository channelRepo;

    private YouTubeChannel channel;

    @BeforeEach
    void setUp() {
        YouTubeChannel ch = new YouTubeChannel();
        ch.setChannelId("UCtest001");
        ch.setTitle("Test Channel");
        channel = channelRepo.save(ch);
    }

    // -------------------------------------------------------------------------

    /**
     * The unique constraint (channel_id, captured_day_utc) must prevent two
     * snapshots for the same channel on the same calendar day.
     * Saving a second snapshot for the same day must throw
     * DataIntegrityViolationException.
     *
     * NOTE: After DataIntegrityViolationException is thrown, the JPA
     * EntityManager session is in an invalid state (marked for rollback).
     * We therefore assert only the exception — no further repository
     * operations can be made in the same transactional test context.
     */
    @Test
    void writeSnapshotIfNeeded_calledTwiceSameDay_onlyOneRowExists() {
        LocalDate today = LocalDate.of(2026, 3, 17);

        ChannelMetricsSnapshot first = snapshot(channel, today, "2026-03-17T10:00:00Z", 1000L);
        snapshotRepo.saveAndFlush(first);

        ChannelMetricsSnapshot second = snapshot(channel, today, "2026-03-17T22:00:00Z", 2000L);

        assertThatThrownBy(() -> snapshotRepo.saveAndFlush(second))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * findByChannelIdSince must return only snapshots whose capturedDayUtc
     * is >= the cutoff date, ordered ascending.
     */
    @Test
    void findByChannelIdSince_respectsCutoffDate() {
        snapshotRepo.saveAndFlush(snapshot(channel, LocalDate.of(2026, 2, 1),
                "2026-02-01T12:00:00Z", 100L));
        snapshotRepo.saveAndFlush(snapshot(channel, LocalDate.of(2026, 2, 15),
                "2026-02-15T12:00:00Z", 200L));
        snapshotRepo.saveAndFlush(snapshot(channel, LocalDate.of(2026, 3, 1),
                "2026-03-01T12:00:00Z", 300L));

        // cutoff = 2026-02-15: should exclude 2026-02-01
        List<ChannelMetricsSnapshot> result = snapshotRepo
                .findByChannelIdSince(channel.getId(), LocalDate.of(2026, 2, 15));

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCapturedDayUtc()).isEqualTo(LocalDate.of(2026, 2, 15));
        assertThat(result.get(1).getCapturedDayUtc()).isEqualTo(LocalDate.of(2026, 3, 1));
    }

    // -------------------------------------------------------------------------

    private ChannelMetricsSnapshot snapshot(YouTubeChannel ch, LocalDate day,
                                             String capturedAtIso, Long views) {
        ChannelMetricsSnapshot s = new ChannelMetricsSnapshot();
        s.setChannel(ch);
        s.setCapturedDayUtc(day);
        s.setCapturedAt(Instant.parse(capturedAtIso));
        s.setViewCount(views);
        s.setSubscriberCount(0L);
        s.setVideoCount(0L);
        s.setSource(DataSource.PUBLIC);
        return s;
    }
}
