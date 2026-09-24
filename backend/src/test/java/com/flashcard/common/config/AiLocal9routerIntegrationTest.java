package com.flashcard.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIfEnvironmentVariable;
import org.mockito.Mockito;

import java.net.InetSocketAddress;
import java.net.Socket;

import static org.junit.jupiter.api.Assertions.*;

@Tag("integration")
@DisabledIfEnvironmentVariable(named = "CI", matches = ".*")
class AiLocal9routerIntegrationTest {

    private static boolean is9routerRunning() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("localhost", 20128), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    void testCall9routerDirectly() throws Exception {
        Assumptions.assumeTrue(is9routerRunning(), "9router daemon is not running on localhost:20128 - skipping local integration test");

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

