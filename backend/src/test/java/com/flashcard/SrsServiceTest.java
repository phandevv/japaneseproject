package com.flashcard;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.srs.service.SpacedRepetitionAlgorithm;
import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.service.StudySessionHelper;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class SrsServiceTest {

    private SrsDataProvider srsDataProvider;
    private VocabularyDataProvider vocabularyDataProvider;
    private StudySessionHelper studySessionHelper;
    private SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private SrsService srsService;
    private User testUser;
    private Vocabulary testVocabulary;

    @BeforeEach
    void setUp() {
        srsDataProvider = Mockito.mock(SrsDataProvider.class);
        vocabularyDataProvider = Mockito.mock(VocabularyDataProvider.class);
        studySessionHelper = Mockito.mock(StudySessionHelper.class);
        spacedRepetitionAlgorithm = Mockito.mock(SpacedRepetitionAlgorithm.class);
        srsService = new SrsService(srsDataProvider, vocabularyDataProvider, studySessionHelper, spacedRepetitionAlgorithm);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testVocabulary = new Vocabulary();
        testVocabulary.setId(10L);
        testVocabulary.setKanji("日本語");
    }

    @Test
    void testReviewWordAgainRating() {
        when(vocabularyDataProvider.getById(10L)).thenReturn(Optional.of(testVocabulary));
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(srsDataProvider.saveWordReview(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Mock FSRS logic for a NEW card rated AGAIN
        Mockito.doAnswer(invocation -> {
            WordReview r = invocation.getArgument(0);
            r.setState(WordReviewState.LEARNING);
            r.setDifficulty(7.0f);
            r.setIntervalDays(0);
            r.setNextReview(java.time.Instant.now().plus(java.time.Duration.ofMinutes(5)));
            return null;
        }).when(spacedRepetitionAlgorithm).calculateNextState(any(WordReview.class), any(ReviewRating.class));

        // quality = 1 (Again) -> ReviewRating.AGAIN
        WordReview review = srsService.reviewWord(testUser, 10L, 1);

        assertEquals(WordReviewState.LEARNING, review.getState());
        assertEquals(7.0f, review.getDifficulty());
        assertNotNull(review.getNextReview());
    }

    @Test
    void testReviewWordGoodRatingProgression() {
        when(vocabularyDataProvider.getById(10L)).thenReturn(Optional.of(testVocabulary));
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(srsDataProvider.saveWordReview(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock FSRS logic for NEW card rated GOOD
        Mockito.doAnswer(invocation -> {
            WordReview r = invocation.getArgument(0);
            r.setState(WordReviewState.LEARNING);
            r.setIntervalDays(1);
            return null;
        }).when(spacedRepetitionAlgorithm).calculateNextState(any(WordReview.class), any(ReviewRating.class));

        // First review, Good rating (quality = 3)
        WordReview review1 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(WordReviewState.LEARNING, review1.getState());
        assertEquals(1, review1.getIntervalDays());

        // Mock return existing review state
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.of(review1));
        
        // Mock FSRS logic for LEARNING card rated GOOD
        Mockito.doAnswer(invocation -> {
            WordReview r = invocation.getArgument(0);
            r.setState(WordReviewState.MATURE);
            r.setIntervalDays(6);
            return null;
        }).when(spacedRepetitionAlgorithm).calculateNextState(any(WordReview.class), any(ReviewRating.class));

        // Second review, Good rating (quality = 3)
        WordReview review2 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(WordReviewState.MATURE, review2.getState());
        assertEquals(6, review2.getIntervalDays());
    }

    @Test
    void testForgotLearnedWordPreservesLearnedStatus() {
        when(vocabularyDataProvider.getById(10L)).thenReturn(Optional.of(testVocabulary));
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(srsDataProvider.saveWordReview(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock FSRS logic for NEW card rated GOOD
        Mockito.doAnswer(invocation -> {
            WordReview r = invocation.getArgument(0);
            r.setState(WordReviewState.MATURE);
            r.setIntervalDays(5);
            return null;
        }).when(spacedRepetitionAlgorithm).calculateNextState(any(WordReview.class), any(ReviewRating.class));

        // 1. First review, Good rating (quality = 3) -> rep=1, interval=1 (learned)
        WordReview review1 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(WordReviewState.MATURE, review1.getState());

        // Mock return existing review state
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.of(review1));

        // Mock FSRS logic for MATURE card rated AGAIN
        Mockito.doAnswer(invocation -> {
            WordReview r = invocation.getArgument(0);
            r.setState(WordReviewState.LEARNING);
            r.setDifficulty(8.0f);
            return null;
        }).when(spacedRepetitionAlgorithm).calculateNextState(any(WordReview.class), any(ReviewRating.class));

        // 2. Second review, Forgot rating (quality = 1)
        WordReview review2 = srsService.reviewWord(testUser, 10L, 1);
        assertEquals(WordReviewState.LEARNING, review2.getState());
        assertEquals(8.0f, review2.getDifficulty());
    }
}
