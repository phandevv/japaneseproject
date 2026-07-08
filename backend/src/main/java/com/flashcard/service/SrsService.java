package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.WordReview;
import com.flashcard.repository.VocabularyRepository;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.model.StudySession;
import com.flashcard.repository.StudySessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SrsService {

    private final WordReviewRepository reviewRepository;
    private final VocabularyRepository vocabularyRepository;
    private final StudySessionRepository sessionRepository;

    public SrsService(WordReviewRepository reviewRepository,
                      VocabularyRepository vocabularyRepository,
                      StudySessionRepository sessionRepository) {
        this.reviewRepository = reviewRepository;
        this.vocabularyRepository = vocabularyRepository;
        this.sessionRepository = sessionRepository;
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
     * Handle word rating submission and recalculate next review interval using SM-2
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

        // Map 1-4 scale to SM-2 0-5 scale
        // 1 (Again) -> q=0 or q=1 (let's use 1)
        // 2 (Hard)  -> q=3
        // 3 (Good)  -> q=4
        // 4 (Easy)  -> q=5
        int q = switch (quality) {
            case 1 -> 1;
            case 2 -> 3;
            case 3 -> 4;
            case 4 -> 5;
            default -> 3;
        };

        double easeFactor = review.getEaseFactor();
        int repetitions = review.getRepetitions();
        int intervalDays;

        if (quality >= 3) { // Good or Easy (success response for learning)
            if (repetitions == 0) {
                intervalDays = 1;
            } else if (repetitions == 1) {
                intervalDays = 6;
            } else {
                int prevInterval = review.getIntervalDays();
                if (prevInterval <= 0) {
                    intervalDays = 1;
                } else {
                    intervalDays = (int) Math.round(prevInterval * easeFactor);
                }
            }
            repetitions++;
        } else { // Forgot (1) or Hard (2) (not learned)
            repetitions = 0;
            intervalDays = 0;
        }

        // Adjust Ease Factor (EF)
        // EF' := EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (easeFactor < 1.3) {
            easeFactor = 1.3;
        }

        review.setEaseFactor(easeFactor);
        review.setRepetitions(repetitions);
        review.setIntervalDays(intervalDays);

        // Schedule next review date
        // If intervalDays is 0, it is due immediately (Instant.now())
        // Otherwise, schedule by days
        Instant nextReview = (intervalDays == 0)
                ? Instant.now()
                : Instant.now().plus(intervalDays, ChronoUnit.DAYS);
        review.setNextReview(nextReview);

        // Set tracking fields
        review.setLastReviewedAt(Instant.now());
        review.setLastRating(quality);

        WordReview savedReview = reviewRepository.save(review);

        // Sync wordsStudied count for today's StudySession
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(zone);
        java.time.Instant start = nowZoned.toLocalDate().atStartOfDay(zone).toInstant();
        java.time.Instant end = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();

        long uniqueCount = reviewRepository.countUniqueReviewedToday(user, start, end);

        StudySession session = sessionRepository.findByUserAndStudyDate(user, nowZoned.toLocalDate())
                .orElseGet(() -> new StudySession(user, nowZoned.toLocalDate()));
        session.setWordsStudied((int) uniqueCount);
        sessionRepository.save(session);

        return savedReview;
    }

    /**
     * Get a random list of already learned vocabulary words for review quiz
     */
    @Transactional(readOnly = true)
    public List<Vocabulary> getRandomLearnedVocabulary(User user, int count) {
        List<WordReview> learned = reviewRepository.findAllLearnedByUser(user);
        if (learned.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        java.util.Collections.shuffle(learned);
        return learned.stream()
                .limit(count)
                .map(WordReview::getVocabulary)
                .collect(Collectors.toList());
    }
}
