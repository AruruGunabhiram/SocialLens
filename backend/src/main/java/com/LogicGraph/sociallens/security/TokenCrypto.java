package com.LogicGraph.sociallens.security;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

final class TokenCrypto {

    static final String PREFIX = "enc:v1:";

    private static final String CIPHER = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom secureRandom = new SecureRandom();

    TokenCrypto(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("sociallens.security.token-encryption-key is required");
        }
        if (secret.length() < 32) {
            throw new IllegalStateException(
                    "sociallens.security.token-encryption-key must be at least 32 characters");
        }
        this.key = new SecretKeySpec(normalizeKey(secret), "AES");
    }

    String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank() || isEncrypted(plaintext)) {
            return plaintext;
        }

        byte[] iv = new byte[IV_BYTES];
        secureRandom.nextBytes(iv);

        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            ByteBuffer payload = ByteBuffer.allocate(iv.length + ciphertext.length);
            payload.put(iv);
            payload.put(ciphertext);

            return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload.array());
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to encrypt OAuth token", ex);
        }
    }

    String decrypt(String storedValue) {
        if (storedValue == null || storedValue.isBlank() || !isEncrypted(storedValue)) {
            return storedValue;
        }

        byte[] payload = Base64.getUrlDecoder().decode(storedValue.substring(PREFIX.length()));
        if (payload.length <= IV_BYTES) {
            throw new IllegalStateException("Invalid encrypted OAuth token payload");
        }

        ByteBuffer buffer = ByteBuffer.wrap(payload);
        byte[] iv = new byte[IV_BYTES];
        buffer.get(iv);
        byte[] ciphertext = new byte[buffer.remaining()];
        buffer.get(ciphertext);

        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to decrypt OAuth token", ex);
        }
    }

    private static boolean isEncrypted(String value) {
        return value.startsWith(PREFIX);
    }

    private static byte[] normalizeKey(String secret) {
        byte[] decoded = tryDecodeBase64(secret);
        if (decoded != null && isValidAesKeyLength(decoded.length)) {
            return decoded;
        }

        return sha256(secret.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] tryDecodeBase64(String secret) {
        try {
            return Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ignored) {
            try {
                return Base64.getUrlDecoder().decode(secret);
            } catch (IllegalArgumentException ignoredAgain) {
                return null;
            }
        }
    }

    private static boolean isValidAesKeyLength(int bytes) {
        return bytes == 16 || bytes == 24 || bytes == 32;
    }

    private static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
