package com.LogicGraph.sociallens.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class EncryptedTokenConverter implements AttributeConverter<String, String> {

    private static volatile TokenCrypto tokenCrypto;

    static void configure(TokenCrypto configuredTokenCrypto) {
        tokenCrypto = configuredTokenCrypto;
    }

    static void resetForTests() {
        tokenCrypto = null;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return attribute;
        }
        return crypto().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return dbData;
        }
        return crypto().decrypt(dbData);
    }

    private static TokenCrypto crypto() {
        TokenCrypto configured = tokenCrypto;
        if (configured == null) {
            throw new IllegalStateException("OAuth token encryption has not been configured");
        }
        return configured;
    }
}
