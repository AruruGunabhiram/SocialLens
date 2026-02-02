package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OAuthAnalyticsRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(OAuthAnalyticsRefreshJob.class);

    private final JobProperties props;
    private final ConnectedAccountRepository connectedAccountRepository;
    private final YouTubeOAuthService oauthService;

    public OAuthAnalyticsRefreshJob(
            JobProperties props,
            ConnectedAccountRepository connectedAccountRepository,
            YouTubeOAuthService oauthService
    ) {
        this.props = props;
        this.connectedAccountRepository = connectedAccountRepository;
        this.oauthService = oauthService;
    }

    @Scheduled(cron = "${sociallens.jobs.oauth-refresh.cron}")
    public void runOAuthRefresh() {
        if (!props.isEnabled() || !props.getOauthRefresh().isEnabled()) {
            log.debug("OAuth refresh disabled: skipping OAuthAnalyticsRefreshJob");
            return;
        }

        var accounts = connectedAccountRepository.findByStatus(ConnectedAccountStatus.ACTIVE);
        log.info("OAuthAnalyticsRefreshJob starting: connectedAccounts={}", accounts.size());

        int refreshed = 0;
        int failed = 0;

        for (var acc : accounts) {
            try {
                boolean didRefresh = oauthService.refreshIfNeeded(acc); // you must add this method
                if (didRefresh) refreshed++;
            } catch (Exception ex) {
                failed++;
                log.warn("OAuthAnalyticsRefreshJob failed for accountId={}: {}", acc.getId(), ex.getMessage(), ex);
            }
        }

        log.info("OAuthAnalyticsRefreshJob finished: refreshed={} failed={} total={}", refreshed, failed, accounts.size());
    }
}
