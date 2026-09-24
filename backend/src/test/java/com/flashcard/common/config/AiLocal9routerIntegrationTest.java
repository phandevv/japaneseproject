package com.flashcard.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;

class AiLocal9routerIntegrationTest {

    @Test
    void testCall9routerDirectly() throws Exception {
        AiConfig config = new AiConfig(
            "http://localhost:20128/v1/chat/completions",
            "or/deepseek/deepseek-v4.1-flash",
            "sk-dec5b2f978fc54fa-o9s8r4-b2903f16"
        );

        VocabularyDataProvider vocabProvider = Mockito.mock(VocabularyDataProvider.class);
        ObjectMapper objectMapper = new ObjectMapper();
        DeepSeekEnrichmentService service = new DeepSeekEnrichmentService(vocabProvider, null, objectMapper, config);

        String result = service.callDeepSeekRawWithParams(config.getApiKey(), "Dịch từ 日本 sang tiếng Việt ngắn gọn", 300, 30);
        assertNotNull(result);
        assertFalse(result.isBlank());
        System.out.println(">>> 9router Response Content: " + result);
    }
}
