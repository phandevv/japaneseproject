package com.flashcard.srs;

import com.flashcard.srs.dto.ReviewCardResponse;
import com.flashcard.srs.dto.ReviewResultResponse;
import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.srs.service.FsrsSchedulerService;
import com.flashcard.srs.service.ReviewService;
import com.flashcard.srs.service.StudySessionHelper;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class ReviewServiceTest {

    private SrsDataProvider srsDataProvider;
    private VocabularyDataProvider vocabularyDataProvider;
    private FsrsSchedulerService fsrsSchedulerService;
    private StudySessionHelper studySessionHelper;
    private ReviewService reviewService;

    private User testUser;
    private User otherUser;
    private Vocabulary testVocab;
    private WordReview testCard;

    @BeforeEach
    void setUp() {
        srsDataProvider = Mockito.mock(SrsDataProvider.class);
        vocabularyDataProvider = Mockito.mock(VocabularyDataProvider.class);
        fsrsSchedulerService = new FsrsSchedulerService(0.9, 36500);
        studySessionHelper = Mockito.mock(StudySessionHelper.class);
        reviewService = new ReviewService(srsDataProvider, vocabularyDataProvider, fsrsSchedulerService, studySessionHelper, 20);

        testUser = new User("alice", "pass");
        testUser.setId(1L);

        otherUser = new User("bob", "pass");
        otherUser.setId(2L);

        testVocab = new Vocabulary();
        testVocab.setId(10L);
        testVocab.setKanji("本");
        testVocab.setHiragana("ほん");
        testVocab.setMeaning("sách");

        testCard = new WordReview(testUser, testVocab);
        testCard.setId(100L);
        testCard.setState(WordReviewState.NEW);
        testCard.setNextReview(Instant.now().minusSeconds(60));
    }

    @Test
    void testGetTodayReviews() {
        when(srsDataProvider.findDueWordReviews(eq(testUser), any(Instant.class), eq(20)))
                .thenReturn(List.of(testCard));

        List<ReviewCardResponse> reviews = reviewService.getTodayReviews(testUser);

        assertEquals(1, reviews.size());
        assertEquals(100L, reviews.get(0).getCardId());
        assertEquals(10L, reviews.get(0).getVocabularyId());
        assertEquals("本", reviews.get(0).getKanji());
        assertNotNull(reviews.get(0).getProjectedIntervals());
    }

    @Test
    void testGetTodayReviewsEmpty() {
        when(srsDataProvider.findDueWordReviews(eq(testUser), any(Instant.class), eq(20)))
                .thenReturn(Collections.emptyList());

        List<ReviewCardResponse> reviews = reviewService.getTodayReviews(testUser);
        assertTrue(reviews.isEmpty());
    }

    @Test
    void testReviewCardSuccess() {
        when(srsDataProvider.findWordReviewById(100L)).thenReturn(Optional.of(testCard));
        when(srsDataProvider.saveWordReview(any(WordReview.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewResultResponse result = reviewService.reviewCard(testUser, 100L, ReviewRating.GOOD);

        assertNotNull(result);
        assertEquals(100L, result.getCardId());
        assertEquals(ReviewRating.GOOD, result.getRating());
        assertNotNull(result.getNextDueAt());
        assertTrue(result.getNextDueAt().isAfter(Instant.now().minusSeconds(1)));
    }

    @Test
    void testReviewCardOtherUserForbidden() {
        when(srsDataProvider.findWordReviewById(100L)).thenReturn(Optional.of(testCard));

        assertThrows(SecurityException.class, () -> {
            reviewService.reviewCard(otherUser, 100L, ReviewRating.GOOD);
        });
    }

    @Test
    void testReviewCardNotFound() {
        when(srsDataProvider.findWordReviewById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            reviewService.reviewCard(testUser, 999L, ReviewRating.GOOD);
        });
    }

    @Test
    void testMarkMasteredCreatesCardWhenNotPresent() {
        when(vocabularyDataProvider.getById(10L)).thenReturn(Optional.of(testVocab));
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocab)).thenReturn(Optional.empty());
        when(srsDataProvider.findByUserAndWordKey(testUser, testVocab)).thenReturn(Optional.empty());
        when(srsDataProvider.saveWordReview(any(WordReview.class))).thenAnswer(inv -> {
            WordReview r = inv.getArgument(0);
            r.setId(200L);
            return r;
        });

        ReviewCardResponse response = reviewService.markMastered(testUser, 10L);

        assertNotNull(response);
        assertEquals(200L, response.getCardId());
        assertEquals("本", response.getKanji());
    }

    @Test
    void testMarkMasteredReusesExistingCard() {
        when(vocabularyDataProvider.getById(10L)).thenReturn(Optional.of(testVocab));
        when(srsDataProvider.findByUserAndVocabulary(testUser, testVocab)).thenReturn(Optional.of(testCard));

        ReviewCardResponse response = reviewService.markMastered(testUser, 10L);

        assertNotNull(response);
        assertEquals(100L, response.getCardId());
    }
}
