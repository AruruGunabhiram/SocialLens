package com.LogicGraph.sociallens.jobs;

import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import com.LogicGraph.sociallens.service.oauth.YouTubeOAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OAuthRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(OAuthRefreshJob.class);

    private final JobProperties props;
    private final ConnectedAccountRepository connectedAccountRepository;
    private final YouTubeOAuthService oauthService;

    public OAuthRefreshJob(
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
            log.debug("OAuth refresh disabled: skipping OAuthRefreshJob");
            return;
        }

        var accounts = connectedAccountRepository.findAll();
        log.info("OAuthRefreshJob starting: connectedAccounts={}", accounts.size());

        int refreshed = 0;
        for (var acc : accounts) {
            try {
                // You should implement a method like: oauthService.refreshIfNeeded(acc)
                // If you don't have it, add it in YouTubeOAuthService.
                boolean didRefresh = oauthService.refreshIfNeeded(acc);
                if (didRefresh) refreshed++;
            } catch (Exception ex) {
                log.warn("OAuthRefreshJob failed for accountId={}: {}", acc.getId(), ex.getMessage());
            }
        }

        log.info("OAuthRefreshJob finished: refreshed={}/{}", refreshed, accounts.size());
    }
}
