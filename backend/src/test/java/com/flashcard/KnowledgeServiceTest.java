package com.flashcard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.User;
import com.flashcard.model.WordReview;
import com.flashcard.repository.GrammarCardRepository;
import com.flashcard.repository.KnowledgeVersionRepository;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.repository.UserRepository;
import com.flashcard.service.KnowledgeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.repository.GrammarReviewRepository;
import static org.mockito.Mockito.*;

class KnowledgeServiceTest {

    private VocabularyRepository vocabularyRepository;
    private GrammarCardRepository grammarCardRepository;
    private KnowledgeVersionRepository knowledgeVersionRepository;
    private WordReviewRepository wordReviewRepository;
    private GrammarReviewRepository grammarReviewRepository;
    private UserRepository userRepository;
    private ObjectMapper objectMapper;
    private KnowledgeService knowledgeService;
    private User testUser;

    @BeforeEach
    void setUp() {
        vocabularyRepository = Mockito.mock(VocabularyRepository.class);
        grammarCardRepository = Mockito.mock(GrammarCardRepository.class);
        knowledgeVersionRepository = Mockito.mock(KnowledgeVersionRepository.class);
        wordReviewRepository = Mockito.mock(WordReviewRepository.class);
        grammarReviewRepository = Mockito.mock(GrammarReviewRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        objectMapper = new ObjectMapper();

        knowledgeService = new KnowledgeService(
                vocabularyRepository,
                grammarCardRepository,
                knowledgeVersionRepository,
                wordReviewRepository,
                grammarReviewRepository,
                userRepository,
                objectMapper
        );

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("test-user");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
    }

    @Test
    void testSaveVocabularyCreatesNewWhenNotExists() throws Exception {
        // Arrange
        Map<String, Object> data = new HashMap<>();
        data.put("word", "将来");
        data.put("reading", "しょうらい");
        data.put("meaning", "tương lai");
        data.put("jlpt", "N3");
        data.put("wordType", "noun");
        data.put("pitchAccent", "しょうらい [1]");
        data.put("mnemonic", "mẹo nhớ tương lai");
        data.put("kanjiWords", List.of());
        data.put("synonyms", List.of("未来"));
        data.put("antonyms", List.of("過去"));
        data.put("commonMistakes", List.of());
        data.put("collocations", List.of());
        data.put("conversationExamples", List.of());
        data.put("exampleSentences", List.of(Map.of("ja", "将来の夢", "reading", "しょうらいのゆめ", "vi", "Ước mơ tương lai")));

        when(vocabularyRepository.findFirstByKanji("将来")).thenReturn(Optional.empty());
        when(vocabularyRepository.save(any(Vocabulary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(wordReviewRepository.findByUserAndVocabulary(any(User.class), any(Vocabulary.class))).thenReturn(Optional.empty());

        // Act
        Vocabulary saved = knowledgeService.saveVocabulary(data, testUser);

        // Assert
        assertNotNull(saved);
        assertEquals("将来", saved.getKanji());
        assertEquals("しょうらい", saved.getHiragana());
        assertEquals("tương lai", saved.getMeaning());
        assertEquals("N3", saved.getLevel());
        assertEquals("noun", saved.getWordType());
        assertEquals("将来の夢", saved.getSampleSentence());
        
        verify(vocabularyRepository).save(any(Vocabulary.class));
        verify(wordReviewRepository).save(any(WordReview.class));
        verify(knowledgeVersionRepository, never()).save(any());
    }

    @Test
    void testSaveVocabularyUpdatesAndVersionsWhenExists() throws Exception {
        // Arrange
        Vocabulary existingVocab = new Vocabulary();
        existingVocab.setId(99L);
        existingVocab.setKanji("将来");
        existingVocab.setHiragana("しょうらい");
        existingVocab.setMeaning("tương lai gần");
        existingVocab.setLevel("N3");

        Map<String, Object> data = new HashMap<>();
        data.put("word", "将来");
        data.put("reading", "しょうらい");
        data.put("meaning", "tương lai xa");
        data.put("jlpt", "N3");
        data.put("wordType", "noun");
        data.put("pitchAccent", "しょうらい [1]");
        data.put("mnemonic", "mẹo nhớ");

        when(vocabularyRepository.findFirstByKanji("将来")).thenReturn(Optional.of(existingVocab));
        when(vocabularyRepository.save(any(Vocabulary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(knowledgeVersionRepository.findByEntityTypeAndEntityIdOrderByVersionNumberDesc("VOCABULARY", 99L))
                .thenReturn(List.of());
        when(wordReviewRepository.findByUserAndVocabulary(any(User.class), any(Vocabulary.class)))
                .thenReturn(Optional.of(new WordReview(testUser, existingVocab)));

        // Act
        Vocabulary saved = knowledgeService.saveVocabulary(data, testUser);

        // Assert
        assertNotNull(saved);
        assertEquals(99L, saved.getId());
        assertEquals("tương lai xa", saved.getMeaning()); // Updated
        
        // Should trigger version history logging
        verify(knowledgeVersionRepository).save(any());
        verify(vocabularyRepository).save(any(Vocabulary.class));
        verify(wordReviewRepository, never()).save(any(WordReview.class));
    }
}
