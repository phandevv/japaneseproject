package com.flashcard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.Vocabulary;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.service.DeepSeekEnrichmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class DeepSeekEnrichmentServiceTest {

    private VocabularyRepository vocabularyRepository;
    private ObjectMapper objectMapper;
    private DeepSeekEnrichmentService enrichmentService;
    private Vocabulary testVocabulary;

    @BeforeEach
    void setUp() {
        vocabularyRepository = Mockito.mock(VocabularyRepository.class);
        objectMapper = new ObjectMapper();
        enrichmentService = new DeepSeekEnrichmentService(vocabularyRepository, objectMapper);

        testVocabulary = new Vocabulary();
        testVocabulary.setId(1L);
        testVocabulary.setKanji("日本");
        testVocabulary.setHiragana("にほん");
        testVocabulary.setMeaning("Nhật Bản");
    }

    @Test
    void testEnrichVocabularyWithoutApiKeySkipsEnrichment() {
        // Run test with API Key unset or empty
        Vocabulary result = enrichmentService.enrichVocabulary(testVocabulary);

        // Should return the exact same vocabulary unmodified and skip DB save
        assertSame(testVocabulary, result);
        assertNull(result.getSampleSentence());
        assertNull(result.getKanjiWords());
        verify(vocabularyRepository, never()).save(any(Vocabulary.class));
    }
}
