package com.LogicGraph.sociallens.service.oauth;

import com.LogicGraph.sociallens.entity.ConnectedAccount;
import com.LogicGraph.sociallens.exception.NotFoundException;
import com.LogicGraph.sociallens.repository.ConnectedAccountRepository;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenService {

    private final ConnectedAccountRepository connectedAccountRepository;
    private final YouTubeOAuthService youTubeOAuthService;

    public GoogleTokenService(ConnectedAccountRepository connectedAccountRepository,
                              YouTubeOAuthService youTubeOAuthService) {
        this.connectedAccountRepository = connectedAccountRepository;
        this.youTubeOAuthService = youTubeOAuthService;
    }

    public ConnectedAccount getYouTubeAccount(Long userId) {
        return connectedAccountRepository
                .findByUser_IdAndPlatform(userId, com.LogicGraph.sociallens.enums.Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException("No YouTube connected account for userId=" + userId));
    }

    /**
     * Returns a valid access token for userId+platform=YOUTUBE.
     * Delegates refresh to YouTubeOAuthService  -  the single canonical refresh path.
     */
    public String getValidAccessToken(Long userId) {
        ConnectedAccount acc = connectedAccountRepository
                .findByUser_IdAndPlatform(userId, com.LogicGraph.sociallens.enums.Platform.YOUTUBE)
                .orElseThrow(() -> new NotFoundException("No YouTube connected account for userId=" + userId));

        youTubeOAuthService.refreshIfNeeded(acc);
        return acc.getAccessToken();
    }
}
