package com.flashcard.srs.service;

import com.flashcard.srs.model.*;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SrsService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SrsService.class);

    private final SrsDataProvider srsDataProvider;
    private final VocabularyDataProvider vocabularyDataProvider;
    private final StudySessionHelper studySessionHelper;
    private final SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private final WordReviewBatchService wordReviewBatchService;

    public SrsService(SrsDataProvider srsDataProvider,
                      VocabularyDataProvider vocabularyDataProvider,
                      StudySessionHelper studySessionHelper,
                      SpacedRepetitionAlgorithm spacedRepetitionAlgorithm) {
        this(srsDataProvider, vocabularyDataProvider, studySessionHelper, spacedRepetitionAlgorithm, new WordReviewBatchService(srsDataProvider));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public SrsService(SrsDataProvider srsDataProvider,
                      VocabularyDataProvider vocabularyDataProvider,
                      StudySessionHelper studySessionHelper,
                      SpacedRepetitionAlgorithm spacedRepetitionAlgorithm,
                      WordReviewBatchService wordReviewBatchService) {
        this.srsDataProvider = srsDataProvider;
        this.vocabularyDataProvider = vocabularyDataProvider;
        this.studySessionHelper = studySessionHelper;
        this.spacedRepetitionAlgorithm = spacedRepetitionAlgorithm;
        this.wordReviewBatchService = wordReviewBatchService;
    }

    /**
     * Get count of due words to review today
     */
    @Transactional(readOnly = true)
    public long getDueCount(User user) {
        return srsDataProvider.countDueWordReviews(user, Instant.now());
    }

    /**
     * Get list of Vocabulary objects that are due for review
     */
    @Transactional(readOnly = true)
    public List<Vocabulary> getDueVocabulary(User user) {
        return srsDataProvider.findDueWordReviews(user, Instant.now())
                .stream()
                .map(WordReview::getVocabulary)
                .collect(Collectors.toList());
    }

    /**
     * Handle word rating submission and recalculate next review interval using FSRS
     * @param quality rating from user: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public WordReview reviewWord(User user, Long vocabularyId, int quality) {
        if (quality < 1 || quality > 4) {
            throw new IllegalArgumentException("Quality rating must be between 1 and 4");
        }

        Vocabulary vocab = vocabularyDataProvider.getById(vocabularyId)
                .orElseThrow(() -> new IllegalArgumentException("Vocabulary word not found"));

        WordReview review = wordReviewBatchService.getPendingReview(user != null ? user.getId() : null, vocab.getId());
        if (review == null) {
            review = srsDataProvider.findByUserAndVocabulary(user, vocab)
                    .orElseGet(() -> new WordReview(user, vocab));
        }

        ReviewRating rating = ReviewRating.fromValue(quality);

        WordReviewState stateBefore = review.getState();
        float difficultyBefore = review.getDifficulty();
        float stabilityBefore = review.getStability();

        spacedRepetitionAlgorithm.calculateNextState(review, rating);

        // Create Review Log
        ReviewLog reviewLog = new ReviewLog(review, rating);
        reviewLog.setStateBefore(stateBefore);
        reviewLog.setStateAfter(review.getState());
        reviewLog.setDifficultyBefore(difficultyBefore);
        reviewLog.setDifficultyAfter(review.getDifficulty());
        reviewLog.setStabilityBefore(stabilityBefore);
        reviewLog.setStabilityAfter(review.getStability());
        reviewLog.setDurationMs(0);

        // Save WordReview and Log synchronously to ensure immediate database consistency & counts
        review = srsDataProvider.saveWordReview(review);
        try {
            srsDataProvider.saveReviewLog(reviewLog);
        } catch (Exception e) {
            log.warn("Failed to save review log: {}", e.getMessage());
        }

        // Sync wordsStudied count for today's StudySession
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(zone);
        java.time.Instant start = nowZoned.toLocalDate().atStartOfDay(zone).toInstant();
        java.time.Instant end = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();

        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);

        updateStudySessionWithRetry(user, nowZoned.toLocalDate(), (int) uniqueCount, null, null, null);

        return review;
    }

    private void updateStudySessionWithRetry(User user, java.time.LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze) {
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                studySessionHelper.saveOrUpdateSessionWithNewTransaction(user, date, wordsStudied, addCorrect, addTotal, freeze);
                return;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                if (i == maxRetries - 1) throw e;
                try {
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    /**
     * Get a random list of already learned vocabulary words for review quiz
     */
    @Transactional(readOnly = true)
    public List<Vocabulary> getRandomLearnedVocabulary(User user, int count) {
        List<Vocabulary> learnedVocabs = srsDataProvider.findLearnedVocabulariesByUser(user, org.springframework.data.domain.PageRequest.of(0, Math.max(count * 5, 100)));
        if (learnedVocabs == null || learnedVocabs.isEmpty()) {
            learnedVocabs = srsDataProvider.findAllByUser(user).stream()
                    .map(WordReview::getVocabulary)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList());
        }
        if (learnedVocabs == null || learnedVocabs.isEmpty()) {
            learnedVocabs = vocabularyDataProvider.getRandom(count * 2);
        }
        if (learnedVocabs == null || learnedVocabs.isEmpty()) {
            learnedVocabs = vocabularyDataProvider.getRandomByLevel("N5", count * 2);
        }
        if (learnedVocabs == null || learnedVocabs.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<Vocabulary> shuffled = new java.util.ArrayList<>(learnedVocabs);
        java.util.Collections.shuffle(shuffled);
        return shuffled.stream()
                .limit(count)
                .collect(Collectors.toList());
    }

    /**
     * Get full list of all word reviews in SRS for the user
     */
    @Transactional(readOnly = true)
    public List<WordReview> getFullSrsList(User user) {
        return srsDataProvider.findAllByUser(user);
    }
}
