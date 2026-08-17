package com.flashcard;

import com.flashcard.knowledge.model.KnowledgeVersion;
import com.flashcard.knowledge.provider.KnowledgeDataProvider;
import com.flashcard.knowledge.service.KnowledgeService;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class KnowledgeServiceTest {

    private VocabularyDataProvider vocabularyDataProvider;
    private KnowledgeDataProvider knowledgeDataProvider;
    private SrsDataProvider srsDataProvider;
    private UserDataProvider userDataProvider;
    private ObjectMapper objectMapper;
    private KnowledgeService knowledgeService;
    private User testUser;

    @BeforeEach
    void setUp() {
        vocabularyDataProvider = Mockito.mock(VocabularyDataProvider.class);
        knowledgeDataProvider = Mockito.mock(KnowledgeDataProvider.class);
        srsDataProvider = Mockito.mock(SrsDataProvider.class);
        userDataProvider = Mockito.mock(UserDataProvider.class);
        objectMapper = new ObjectMapper();

        knowledgeService = new KnowledgeService(
                vocabularyDataProvider,
                knowledgeDataProvider,
                srsDataProvider,
                userDataProvider,
                objectMapper,
                null,
                null,
                null,
                null
        );

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("test-user");

        when(userDataProvider.findById(1L)).thenReturn(Optional.of(testUser));
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

        when(vocabularyDataProvider.findFirstByKanji("将来")).thenReturn(Optional.empty());
        when(vocabularyDataProvider.save(any(Vocabulary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(srsDataProvider.findByUserAndVocabulary(any(User.class), any(Vocabulary.class))).thenReturn(Optional.empty());

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
        
        verify(vocabularyDataProvider).save(any(Vocabulary.class));
        verify(srsDataProvider).saveWordReview(any(WordReview.class));
        verify(knowledgeDataProvider, never()).saveVersion(any());
    }

    @Test
    void testSaveVocabularyUpdatesAndVersionsWhenExistsAndUserIsAdmin() throws Exception {
        // Arrange
        testUser.setRole("ADMIN");
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

        when(vocabularyDataProvider.findFirstByKanji("将来")).thenReturn(Optional.of(existingVocab));
        when(vocabularyDataProvider.save(any(Vocabulary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(knowledgeDataProvider.findVersions("VOCABULARY", 99L))
                .thenReturn(List.of());
        when(srsDataProvider.findByUserAndVocabulary(any(User.class), any(Vocabulary.class)))
                .thenReturn(Optional.of(new WordReview(testUser, existingVocab)));

        // Act
        Vocabulary saved = knowledgeService.saveVocabulary(data, testUser);

        // Assert
        assertNotNull(saved);
        assertEquals(99L, saved.getId());
        assertEquals("tương lai xa", saved.getMeaning()); // Updated because user is ADMIN
        
        // Should trigger version history logging
        verify(knowledgeDataProvider).saveVersion(any());
        verify(vocabularyDataProvider).save(any(Vocabulary.class));
    }

    @Test
    void testSaveVocabularyUpdatesEnrichmentWithoutVersionHistoryForNonAdmin() throws Exception {
        // Arrange: normal user (ROLE = USER)
        testUser.setRole("USER");
        Vocabulary existingVocab = new Vocabulary();
        existingVocab.setId(99L);
        existingVocab.setKanji("将来");
        existingVocab.setHiragana("しょうらい");
        existingVocab.setMeaning("tương lai gốc");
        existingVocab.setLevel("N3");

        Map<String, Object> data = new HashMap<>();
        data.put("word", "将来");
        data.put("reading", "しょうらい");
        data.put("meaning", "nghĩa mới từ AI");

        when(vocabularyDataProvider.findFirstByKanji("将来")).thenReturn(Optional.of(existingVocab));
        when(vocabularyDataProvider.save(any(Vocabulary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(srsDataProvider.findByUserAndVocabulary(any(User.class), any(Vocabulary.class)))
                .thenReturn(Optional.of(new WordReview(testUser, existingVocab)));

        // Act
        Vocabulary saved = knowledgeService.saveVocabulary(data, testUser);

        // Assert
        assertNotNull(saved);
        assertEquals(99L, saved.getId());
        assertEquals("nghĩa mới từ AI", saved.getMeaning()); // Updated enrichment data in place
        
        // Version history must NOT be created for non-admin
        verify(knowledgeDataProvider, never()).saveVersion(any());
    }
}
