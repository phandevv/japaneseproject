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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class SrsServiceTest {

    private WordReviewRepository reviewRepository;
    private VocabularyRepository vocabularyRepository;
    private SrsService srsService;
    private User testUser;
    private Vocabulary testVocabulary;

    @BeforeEach
    void setUp() {
        reviewRepository = Mockito.mock(WordReviewRepository.class);
        vocabularyRepository = Mockito.mock(VocabularyRepository.class);
        srsService = new SrsService(reviewRepository, vocabularyRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testVocabulary = new Vocabulary();
        testVocabulary.setId(10L);
        testVocabulary.setKanji("日本語");
    }

    @Test
    void testReviewWordAgainRating() {
        when(vocabularyRepository.findById(10L)).thenReturn(Optional.of(testVocabulary));
        when(reviewRepository.findByUserAndVocabulary(testUser, testVocabulary)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(WordReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // quality = 1 (Again)
        WordReview review = srsService.reviewWord(testUser, 10L, 1);

        assertEquals(0, review.getRepetitions());
        assertEquals(1, review.getIntervalDays());
        assertTrue(review.getEaseFactor() < 2.5); // Ease factor should decrease on poor rating
        assertTrue(review.getNextReview().isAfter(Instant.now()));
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
}
