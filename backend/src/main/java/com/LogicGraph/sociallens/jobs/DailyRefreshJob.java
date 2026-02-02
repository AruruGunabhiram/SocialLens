package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DailyRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(DailyRefreshJob.class);

    private final JobProperties props;
    private final YouTubeChannelRepository channelRepo;
    private final DailyRefreshWorker worker;

    public DailyRefreshJob(
            JobProperties props,
            YouTubeChannelRepository channelRepo,
            DailyRefreshWorker worker
    ) {
        this.props = props;
        this.channelRepo = channelRepo;
        this.worker = worker;
    }

    @Scheduled(cron = "${sociallens.jobs.daily-refresh.cron}")
    public void runDailyRefresh() {
        if (!props.isEnabled() || !props.getDailyRefresh().isEnabled()) {
            log.debug("Daily refresh disabled: skipping DailyRefreshJob");
            return;
        }

        var channels = channelRepo.findByActiveTrue();

        int processed = 0;
        int ok = 0;
        int failed = 0;

        int maxChannels = props.getDailyRefresh().getMaxChannelsPerRun();

        log.info("DailyRefreshJob starting: channels={} maxChannels={}", channels.size(), maxChannels);

        for (var ch : channels) {
            if (processed >= maxChannels) break;
            processed++;

            try {
                worker.refreshOneChannel(ch.getId());
                ok++;
            } catch (Exception ex) {
                failed++;
                log.warn("DailyRefreshJob failed channelId={}: {}", ch.getChannelId(), ex.getMessage(), ex);
            }
        }

        log.info("DailyRefreshJob finished: processed={} ok={} failed={}", processed, ok, failed);
    }
}
