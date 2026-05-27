package com.LogicGraph.sociallens.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EncryptedTokenConverterTest {

    private EncryptedTokenConverter converter;

    @BeforeEach
    void setUp() {
        EncryptedTokenConverter.configure(new TokenCrypto("test-token-encryption-key-at-least-32-chars"));
        converter = new EncryptedTokenConverter();
    }

    @AfterEach
    void tearDown() {
        EncryptedTokenConverter.resetForTests();
    }

    @Test
    void convertToDatabaseColumn_encryptsPlaintextToken() {
        String encrypted = converter.convertToDatabaseColumn("access-token");

        assertThat(encrypted).startsWith(TokenCrypto.PREFIX);
        assertThat(encrypted).doesNotContain("access-token");
        assertThat(converter.convertToEntityAttribute(encrypted)).isEqualTo("access-token");
    }

    @Test
    void convertToEntityAttribute_allowsLegacyPlaintextToken() {
        assertThat(converter.convertToEntityAttribute("legacy-token")).isEqualTo("legacy-token");
    }

    @Test
    void convertToDatabaseColumn_doesNotDoubleEncrypt() {
        String encrypted = converter.convertToDatabaseColumn("refresh-token");

        assertThat(converter.convertToDatabaseColumn(encrypted)).isEqualTo(encrypted);
    }

    @Test
    void tokenCrypto_rejectsBlankKey() {
        assertThatThrownBy(() -> new TokenCrypto(""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("required");
    }

    @Test
    void tokenCrypto_rejectsKeyShortterThan32Chars() {
        assertThatThrownBy(() -> new TokenCrypto("too-short"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 characters");
    }

    @Test
    void tokenCrypto_accepts32CharKey() {
        // Exactly 32 characters - should not throw
        TokenCrypto crypto = new TokenCrypto("12345678901234567890123456789012");
        assertThat(crypto.encrypt("token")).startsWith(TokenCrypto.PREFIX);
    }
}
