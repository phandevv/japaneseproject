package com.flashcard.srs;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.service.FsrsSchedulerService;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import io.github.openspacedrepetition.Card;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FsrsSchedulerServiceTest {

    private FsrsSchedulerService fsrsSchedulerService;
    private WordReview testCard;

    @BeforeEach
    void setUp() {
        fsrsSchedulerService = new FsrsSchedulerService(0.9, 36500);

        User user = new User("tester", "password");
        user.setId(1L);

        Vocabulary vocab = new Vocabulary();
        vocab.setId(100L);
        vocab.setKanji("食べる");
        vocab.setHiragana("たべる");
        vocab.setMeaning("ăn");

        testCard = new WordReview(user, vocab);
        testCard.setId(10L);
        testCard.setState(WordReviewState.NEW);
        testCard.setDifficulty(0.0f);
        testCard.setStability(0.0f);
        testCard.setNextReview(Instant.now());
    }

    @Test
    void testToFsrsCard() {
        Card card = fsrsSchedulerService.toFsrsCard(testCard);
        assertNotNull(card);
        assertEquals(10, card.getCardId());
        assertNotNull(card.getDue());
    }

    @Test
    void testReviewCardGood() {
        Instant now = Instant.now();
        fsrsSchedulerService.calculateNextState(testCard, ReviewRating.GOOD, now);

        assertTrue(testCard.getStability() > 0.0f);
        assertTrue(testCard.getDifficulty() > 0.0f);
        assertNotNull(testCard.getNextReview());
        assertTrue(testCard.getNextReview().isAfter(now) || testCard.getNextReview().equals(now));
        assertEquals(1, testCard.getReviewCount());
        assertEquals(1, testCard.getCorrectCount());
        assertEquals(0, testCard.getWrongCount());
        assertEquals(1, testCard.getConsecutiveCorrect());
    }

    @Test
    void testReviewCardAgainResetsConsecutive() {
        Instant now = Instant.now();
        // First good review
        fsrsSchedulerService.calculateNextState(testCard, ReviewRating.GOOD, now);
        assertEquals(1, testCard.getConsecutiveCorrect());

        // Then again review
        fsrsSchedulerService.calculateNextState(testCard, ReviewRating.AGAIN, now.plusSeconds(3600));
        assertEquals(0, testCard.getConsecutiveCorrect());
        assertEquals(1, testCard.getWrongCount());
        assertEquals(2, testCard.getReviewCount());
        assertEquals(WordReviewState.LEARNING, testCard.getState());
    }

    @Test
    void testReviewCardEasy() {
        Instant now = Instant.now();
        fsrsSchedulerService.calculateNextState(testCard, ReviewRating.EASY, now);

        assertTrue(testCard.getStability() > 1.0f);
        assertNotNull(testCard.getNextReview());
        assertEquals(1, testCard.getCorrectCount());
    }

    @Test
    void testGetProjectedIntervals() {
        Map<String, Integer> projections = fsrsSchedulerService.getProjectedIntervals(testCard);

        assertNotNull(projections);
        assertTrue(projections.containsKey("AGAIN"));
        assertTrue(projections.containsKey("HARD"));
        assertTrue(projections.containsKey("GOOD"));
        assertTrue(projections.containsKey("EASY"));
        assertTrue(projections.get("AGAIN") >= 0);
        assertTrue(projections.get("EASY") >= projections.get("AGAIN"));
    }
}
