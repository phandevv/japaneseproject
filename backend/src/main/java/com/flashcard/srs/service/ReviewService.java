package com.flashcard.srs.service;

import com.flashcard.srs.dto.ReviewCardResponse;
import com.flashcard.srs.dto.ReviewResultResponse;
import com.flashcard.srs.model.ReviewLog;
import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private final SrsDataProvider srsDataProvider;
    private final VocabularyDataProvider vocabularyDataProvider;
    private final FsrsSchedulerService fsrsSchedulerService;
    private final StudySessionHelper studySessionHelper;
    private final int dailyLimit;

    public ReviewService(SrsDataProvider srsDataProvider,
                         VocabularyDataProvider vocabularyDataProvider,
                         FsrsSchedulerService fsrsSchedulerService,
                         StudySessionHelper studySessionHelper,
                         @Value("${review.daily-limit:20}") int dailyLimit) {
        this.srsDataProvider = srsDataProvider;
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.fsrsSchedulerService = fsrsSchedulerService;
        this.studySessionHelper = studySessionHelper;
        this.dailyLimit = dailyLimit;
    }

    /**
     * GET /api/reviews/today
     * Fetches due cards for current user (dueAt <= current time), limited by daily-limit.
     */
    @Transactional(readOnly = true)
    public List<ReviewCardResponse> getTodayReviews(User user) {
        if (user == null) {
            return Collections.emptyList();
        }

        Instant now = Instant.now();
        List<WordReview> dueReviews = srsDataProvider.findDueWordReviews(user, now, dailyLimit);

        if (dueReviews == null || dueReviews.isEmpty()) {
            return Collections.emptyList();
        }

        List<ReviewCardResponse> responses = new ArrayList<>();
        for (WordReview wr : dueReviews) {
            responses.add(mapToCardResponse(wr));
        }

        return responses;
    }

    /**
     * POST /api/reviews/{cardId}
     * Executes spaced repetition rating with FSRS, updates card and saves log.
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public ReviewResultResponse reviewCard(User user, Long cardId, ReviewRating rating) {
        if (user == null) {
            throw new SecurityException("Unauthenticated user");
        }
        if (rating == null) {
            throw new IllegalArgumentException("Rating is required (AGAIN, HARD, GOOD, EASY)");
        }

        WordReview card = srsDataProvider.findWordReviewById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Review card not found with ID: " + cardId));

        if (card.getUser() == null || !card.getUser().getId().equals(user.getId())) {
            throw new SecurityException("User does not have permission to review this card");
        }

        Instant prevDue = card.getNextReview();
        WordReviewState stateBefore = card.getState();
        float diffBefore = card.getDifficulty();
        float stabBefore = card.getStability();

        Instant now = Instant.now();
        fsrsSchedulerService.calculateNextState(card, rating, now);

        card = srsDataProvider.saveWordReview(card);

        // Save Review Log
        try {
            ReviewLog reviewLog = new ReviewLog(card, rating);
            reviewLog.setStateBefore(stateBefore);
            reviewLog.setStateAfter(card.getState());
            reviewLog.setDifficultyBefore(diffBefore);
            reviewLog.setDifficultyAfter(card.getDifficulty());
            reviewLog.setStabilityBefore(stabBefore);
            reviewLog.setStabilityAfter(card.getStability());
            reviewLog.setDurationMs(0);
            srsDataProvider.saveReviewLog(reviewLog);
        } catch (Exception e) {
            log.warn("Failed to save review log for card {}: {}", cardId, e.getMessage());
        }

        // Synchronize study session / commit grid stats
        try {
            ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
            ZonedDateTime nowZoned = ZonedDateTime.now(zone);
            Instant start = nowZoned.toLocalDate().atStartOfDay(zone).toInstant();
            Instant end = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
            long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);
            studySessionHelper.saveOrUpdateSessionWithNewTransaction(user, nowZoned.toLocalDate(), (int) uniqueCount, null, null, null);
        } catch (Exception e) {
            log.debug("Failed to sync study session on review: {}", e.getMessage());
        }

        ReviewResultResponse result = new ReviewResultResponse();
        result.setCardId(card.getId());
        if (card.getVocabulary() != null) {
            result.setVocabularyId(card.getVocabulary().getId());
        }
        result.setRating(rating);
        result.setPreviousDueAt(prevDue);
        result.setNextDueAt(card.getNextReview());
        result.setState(card.getState());
        result.setIntervalDays(card.getIntervalDays());
        result.setStability(card.getStability());
        result.setDifficulty(card.getDifficulty());

        return result;
    }

    /**
     * POST /api/vocabularies/{vocabularyId}/master
     * Marks vocabulary as mastered and ensures a ReviewCard exists in SRS.
     */
    @Transactional
    public ReviewCardResponse markMastered(User user, Long vocabularyId) {
        if (user == null) {
            throw new SecurityException("Unauthenticated user");
        }

        Vocabulary vocab = vocabularyDataProvider.getById(vocabularyId)
                .orElseThrow(() -> new IllegalArgumentException("Vocabulary not found with ID: " + vocabularyId));

        // Deduplication gateway: check by ID or wordKey
        WordReview review = srsDataProvider.findByUserAndVocabulary(user, vocab).orElse(null);
        if (review == null) {
            review = srsDataProvider.findByUserAndWordKey(user, vocab).orElse(null);
        }

        if (review == null) {
            review = new WordReview(user, vocab);
            review.setState(WordReviewState.NEW);
            review.setDifficulty(4.93f);
            review.setStability(0.4f);
            review.setIntervalDays(1);
            review.setNextReview(Instant.now());
            review = srsDataProvider.saveWordReview(review);
        }

        return mapToCardResponse(review);
    }

    private ReviewCardResponse mapToCardResponse(WordReview wr) {
        ReviewCardResponse resp = new ReviewCardResponse();
        resp.setCardId(wr.getId());
        Vocabulary v = wr.getVocabulary();
        if (v != null) {
            resp.setVocabularyId(v.getId());
            resp.setKanji(v.getKanji());
            resp.setHiragana(v.getHiragana());
            resp.setRomaji(v.getRomaji());
            resp.setHanViet(v.getHanViet());
            resp.setMeaning(v.getMeaning());
            resp.setWordType(v.getWordType());
            resp.setPitchAccent(v.getPitchAccent());
            resp.setSampleSentence(v.getSampleSentence());
            resp.setSampleReading(v.getSampleReading());
            resp.setSampleTranslation(v.getSampleTranslation());
        }
        resp.setDueAt(wr.getNextReview());
        resp.setState(wr.getState());
        resp.setStability(wr.getStability());
        resp.setDifficulty(wr.getDifficulty());
        resp.setRepetitions(wr.getRepetitions());
        resp.setIntervalDays(wr.getIntervalDays());
        resp.setProjectedIntervals(fsrsSchedulerService.getProjectedIntervals(wr));
        return resp;
    }
}
