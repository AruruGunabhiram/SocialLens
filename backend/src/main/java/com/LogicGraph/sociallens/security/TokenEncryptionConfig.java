package com.LogicGraph.sociallens.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class TokenEncryptionConfig {

    @Value("${sociallens.security.token-encryption-key:}")
    private String tokenEncryptionKey;

    @PostConstruct
    void configureConverter() {
        EncryptedTokenConverter.configure(new TokenCrypto(tokenEncryptionKey));
    }
}
