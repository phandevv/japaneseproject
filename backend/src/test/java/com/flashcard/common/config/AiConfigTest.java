package com.flashcard.common.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AiConfigTest {

    @Test
    void testDefaultsWhenNullOrBlank() {
        AiConfig config = new AiConfig(null, null, null);
        assertNotNull(config.getApiUrl());
        assertFalse(config.getApiUrl().isBlank());
        assertNotNull(config.getModel());
        assertFalse(config.getModel().isBlank());
    }

    @Test
    void testCustomConfiguration() {
        AiConfig config = new AiConfig("https://custom-ai-gateway.com/v1/chat", "custom-model-v2", "custom-key-123");
        assertEquals("https://custom-ai-gateway.com/v1/chat", config.getApiUrl());
        assertEquals("custom-model-v2", config.getModel());
        assertEquals("custom-key-123", config.getApiKey());
    }

    @Test
    void testBlankPropertiesFallbackToDefaults() {
        AiConfig config = new AiConfig("   ", "", "  ");
        assertNotNull(config.getApiUrl());
        assertFalse(config.getApiUrl().isBlank());
        assertNotNull(config.getModel());
        assertFalse(config.getModel().isBlank());
    }

    @Test
    void test9routerConfiguration() {
        AiConfig config = new AiConfig("https://api.9router.com/v1/chat/completions", "deepseek/deepseek-chat", "sk-9router-secret");
        assertEquals("https://api.9router.com/v1/chat/completions", config.getApiUrl());
        assertEquals("deepseek/deepseek-chat", config.getModel());
        assertEquals("sk-9router-secret", config.getApiKey());
    }
}
