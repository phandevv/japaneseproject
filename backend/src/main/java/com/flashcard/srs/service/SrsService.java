package com.flashcard.srs.service;

import com.flashcard.srs.model.ReviewLog;
import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.StudySession;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.repository.ReviewLogRepository;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.srs.model.WordReview;
import com.flashcard.vocabulary.repository.VocabularyRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SrsService {

    private final WordReviewRepository reviewRepository;
    private final VocabularyRepository vocabularyRepository;
    private final StudySessionHelper studySessionHelper;

    private final SpacedRepetitionAlgorithm spacedRepetitionAlgorithm;
    private final com.flashcard.srs.repository.ReviewLogRepository reviewLogRepository;

    public SrsService(WordReviewRepository reviewRepository,
                      VocabularyRepository vocabularyRepository,
                      StudySessionHelper studySessionHelper,
                      SpacedRepetitionAlgorithm spacedRepetitionAlgorithm,
                      com.flashcard.srs.repository.ReviewLogRepository reviewLogRepository) {
        this.reviewRepository = reviewRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.studySessionHelper = studySessionHelper;
        this.spacedRepetitionAlgorithm = spacedRepetitionAlgorithm;
        this.reviewLogRepository = reviewLogRepository;
    }

    /**
     * Get count of due words to review today
     */
    @Transactional(readOnly = true)
    public long getDueCount(User user) {
        return reviewRepository.countByUserAndNextReviewBefore(user, Instant.now());
    }

    /**
     * Get list of Vocabulary objects that are due for review
     */
    @Transactional(readOnly = true)
    public List<Vocabulary> getDueVocabulary(User user) {
        return reviewRepository.findByUserAndNextReviewBefore(user, Instant.now())
                .stream()
                .map(WordReview::getVocabulary)
                .collect(Collectors.toList());
    }

    /**
     * Handle word rating submission and recalculate next review interval using FSRS
     * @param quality rating from user: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
     */
    @Transactional
    public WordReview reviewWord(User user, Long vocabularyId, int quality) {
        if (quality < 1 || quality > 4) {
            throw new IllegalArgumentException("Quality rating must be between 1 and 4");
        }

        Vocabulary vocab = vocabularyRepository.findById(vocabularyId)
                .orElseThrow(() -> new IllegalArgumentException("Vocabulary word not found"));

        WordReview review = reviewRepository.findByUserAndVocabulary(user, vocab)
                .orElseGet(() -> new WordReview(user, vocab));

        com.flashcard.srs.model.ReviewRating rating = com.flashcard.srs.model.ReviewRating.fromValue(quality);
        
        com.flashcard.srs.model.WordReviewState stateBefore = review.getState();
        float difficultyBefore = review.getDifficulty();
        float stabilityBefore = review.getStability();

        spacedRepetitionAlgorithm.calculateNextState(review, rating);

        WordReview savedReview = reviewRepository.save(review);

        // Create Review Log
        com.flashcard.srs.model.ReviewLog reviewLog = new com.flashcard.srs.model.ReviewLog(savedReview, rating);
        reviewLog.setStateBefore(stateBefore);
        reviewLog.setStateAfter(savedReview.getState());
        reviewLog.setDifficultyBefore(difficultyBefore);
        reviewLog.setDifficultyAfter(savedReview.getDifficulty());
        reviewLog.setStabilityBefore(stabilityBefore);
        reviewLog.setStabilityAfter(savedReview.getStability());
        // Assume shownAt and answeredAt logic will be provided in a DTO later, currently we just set defaults
        reviewLog.setDurationMs(0); 
        reviewLogRepository.save(reviewLog);

        // Sync wordsStudied count for today's StudySession
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(zone);
        java.time.Instant start = nowZoned.toLocalDate().atStartOfDay(zone).toInstant();
        java.time.Instant end = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();

        long uniqueCount = reviewRepository.countUniqueReviewedToday(user, start, end);

        updateStudySessionWithRetry(user, nowZoned.toLocalDate(), (int) uniqueCount, null, null, null);

        return savedReview;
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
        List<Vocabulary> learnedVocabs = reviewRepository.findLearnedVocabulariesByUser(user, org.springframework.data.domain.PageRequest.of(0, Math.max(count * 5, 100)));
        if (learnedVocabs.isEmpty()) {
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
        return reviewRepository.findAllByUserFetchVocabulary(user);
    }
}

