package com.flashcard;

import com.flashcard.model.User;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.WordReview;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.service.SrsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.flashcard.service.StudySessionHelper;
import com.flashcard.repository.StudySessionRepository;

class SrsServiceTest {

    private WordReviewRepository reviewRepository;
    private VocabularyRepository vocabularyRepository;
    private StudySessionRepository sessionRepository;
    private StudySessionHelper studySessionHelper;
    private SrsService srsService;
    private User testUser;
    private Vocabulary testVocabulary;

    private com.flashcard.service.SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private com.flashcard.repository.ReviewLogRepository reviewLogRepository;

    @BeforeEach
    void setUp() {
        reviewRepository = Mockito.mock(WordReviewRepository.class);
        vocabularyRepository = Mockito.mock(VocabularyRepository.class);
        sessionRepository = Mockito.mock(StudySessionRepository.class);
        studySessionHelper = Mockito.mock(StudySessionHelper.class);
        spacedRepetitionAlgorithm = Mockito.mock(com.flashcard.service.SpacedRepetitionAlgorithm.class);
        reviewLogRepository = Mockito.mock(com.flashcard.repository.ReviewLogRepository.class);
        srsService = new SrsService(reviewRepository, vocabularyRepository, studySessionHelper, spacedRepetitionAlgorithm, reviewLogRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testVocabulary = new Vocabulary();
        testVocabulary.setId(10L);
        testVocabulary.setKanji("日本語");

        // Global mocks for sessionRepository
        when(sessionRepository.findByUserAndStudyDate(any(User.class), any(java.time.LocalDate.class)))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any(com.flashcard.model.StudySession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void testReviewWordAgainRating() {
        when(vocabularyRepository.findById(10L)).thenReturn(Optional.of(testVocabulary));
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // quality = 1 (Again)
        WordReview review = srsService.reviewWord(testUser, 10L, 1);

        assertEquals(0, review.getRepetitions());
        assertEquals(0, review.getIntervalDays());
        assertTrue(review.getEaseFactor() < 2.5); // Ease factor should decrease on poor rating
        assertNotNull(review.getNextReview());
    }

    @Test
    void testReviewWordGoodRatingProgression() {
        when(vocabularyRepository.findById(10L)).thenReturn(Optional.of(testVocabulary));
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // First review, Good rating (quality = 3)
        WordReview review1 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(1, review1.getRepetitions());
        assertEquals(1, review1.getIntervalDays());

        // Mock return existing review state
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.of(review1));

        // Second review, Good rating (quality = 3)
        WordReview review2 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(2, review2.getRepetitions());
        assertEquals(6, review2.getIntervalDays()); // 2nd repetition always defaults to 6 days in SM-2
    }

    @Test
    void testForgotLearnedWordPreservesLearnedStatus() {
        when(vocabularyRepository.findById(10L)).thenReturn(Optional.of(testVocabulary));
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. First review, Good rating (quality = 3) -> rep=1, interval=1 (learned)
        WordReview review1 = srsService.reviewWord(testUser, 10L, 3);
        assertEquals(1, review1.getRepetitions());
        assertEquals(1, review1.getIntervalDays());

        // Mock return existing review state
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.of(review1));

        // 2. Second review, Forgot rating (quality = 1) -> should set repetitions to 0 but keep intervalDays = 1 (learned)
        WordReview review2 = srsService.reviewWord(testUser, 10L, 1);
        assertEquals(0, review2.getRepetitions());
        assertEquals(1, review2.getIntervalDays()); // Preserves learned status (> 0)
    }
}
