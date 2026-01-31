package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.YouTubeChannelRepository;
import com.LogicGraph.sociallens.service.YouTubeSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DailyRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(DailyRefreshJob.class);

    private final JobProperties props;
    private final YouTubeChannelRepository channelRepo;
    private final YouTubeSyncService syncService;

    public DailyRefreshJob(
            JobProperties props,
            YouTubeChannelRepository channelRepo,
            YouTubeSyncService syncService
    ) {
        this.props = props;
        this.channelRepo = channelRepo;
        this.syncService = syncService;
    }

    @Scheduled(cron = "${sociallens.jobs.daily-refresh.cron}")
    public void runDailyRefresh() {
        if (!props.isEnabled()) {
            log.debug("Jobs disabled: skipping DailyRefreshJob");
            return;
        }

        // Hard cap budget per run
        ApiCallBudget budget = new ApiCallBudget(props.getMaxApiCallsPerRun());

        // NOTE: You will need an 'active' flag on YouTubeChannel OR you approximate eligibility differently.
        // If you don't have it yet, your “guardrail” is: refresh only channels that exist + optionally recently synced.
        var channels = channelRepo.findByActiveTrue(); // replace with findByActiveTrue() when you add active flag

        int processed = 0;
        int maxChannels = props.getMaxChannelsPerRun();

        log.info("DailyRefreshJob starting: channels={}, maxChannelsPerRun={}, maxApiCallsPerRun={}",
                channels.size(), maxChannels, budget.max());

        for (var ch : channels) {
            if (processed >= maxChannels) break;

            try {
                // Minimal call budgeting assumption:
                // - channel metadata + video list + metrics snapshot could be ~5-15 calls depending on pagination
                // You will refine this later based on your YouTubeService implementation.
                if (!budget.tryConsume(10)) {
                    log.warn("DailyRefreshJob budget exhausted: used={}, remaining={}", budget.used(), budget.remaining());
                    break;
                }

                // If you implement refresh scopes later, pass flags. For now, call your existing sync method.
                // Example: syncService.syncChannelByChannelId(ch.getChannelId());
                syncService.syncChannel(ch.getChannelId());

                processed++;
            } catch (Exception ex) {
                // Don’t kill the whole run because one channel fails.
                log.error("DailyRefreshJob failed for channelId={}: {}", ch.getChannelId(), ex.getMessage(), ex);
            }
        }

        log.info("DailyRefreshJob finished: processed={}, apiCallsUsed={}, apiCallsRemaining={}",
                processed, budget.used(), budget.remaining());
    }
}
