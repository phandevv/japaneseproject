package com.flashcard;

import com.flashcard.knowledge.service.DeepSeekEnrichmentService;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

class DeepSeekEnrichmentServiceTest {

    private VocabularyDataProvider vocabularyDataProvider;
    private ObjectMapper objectMapper;
    private DeepSeekEnrichmentService enrichmentService;
    private Vocabulary testVocabulary;

    @BeforeEach
    void setUp() {
        vocabularyDataProvider = Mockito.mock(VocabularyDataProvider.class);
        Mockito.when(vocabularyDataProvider.save(any(Vocabulary.class))).thenAnswer(i -> i.getArgument(0));
        objectMapper = new ObjectMapper();
        com.flashcard.common.config.AiConfig mockAiConfig = Mockito.mock(com.flashcard.common.config.AiConfig.class);
        Mockito.when(mockAiConfig.getApiKey()).thenReturn("");
        enrichmentService = new DeepSeekEnrichmentService(vocabularyDataProvider, null, objectMapper, mockAiConfig);

        testVocabulary = new Vocabulary();
        testVocabulary.setId(1L);
        testVocabulary.setKanji("日本");
        testVocabulary.setHiragana("にほん");
        testVocabulary.setMeaning("Nhật Bản");
    }

    @Test
    void testEnrichVocabularyReturnsValidVocabulary() {
        Vocabulary result = enrichmentService.enrichVocabulary(testVocabulary).join();
        assertNotNull(result);
        assertEquals("日本", result.getKanji());
        assertEquals("Nhật Bản", result.getMeaning());
    }
}
