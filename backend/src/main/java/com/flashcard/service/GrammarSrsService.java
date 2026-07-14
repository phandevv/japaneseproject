package com.flashcard.service;

import com.flashcard.model.GrammarCard;
import com.flashcard.model.GrammarReview;
import com.flashcard.model.User;
import com.flashcard.repository.GrammarCardRepository;
import com.flashcard.repository.GrammarReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GrammarSrsService {

    private final GrammarReviewRepository grammarReviewRepository;
    private final GrammarCardRepository grammarCardRepository;

    @Autowired
    public GrammarSrsService(GrammarReviewRepository grammarReviewRepository,
                             GrammarCardRepository grammarCardRepository) {
        this.grammarReviewRepository = grammarReviewRepository;
        this.grammarCardRepository = grammarCardRepository;
    }

    /**
     * Get count of due grammar cards to review today.
     */
    @Transactional(readOnly = true)
    public long getDueCount(User user) {
        List<GrammarReview> reviews = grammarReviewRepository.findByUserId(user.getId());
        Instant now = Instant.now();
        return reviews.stream()
                .filter(r -> r.getNextReview().isBefore(now))
                .count();
    }

    /**
     * Get list of Grammar cards that are due for review.
     */
    @Transactional(readOnly = true)
    public List<GrammarCard> getDueGrammar(User user) {
        List<GrammarReview> reviews = grammarReviewRepository.findByUserId(user.getId());
        Instant now = Instant.now();
        return reviews.stream()
                .filter(r -> r.getNextReview().isBefore(now))
                .map(GrammarReview::getGrammarCard)
                .collect(Collectors.toList());
    }

    /**
     * Handle grammar rating submission and recalculate next review interval using SM-2.
     * @param quality rating from user: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
     */
    @Transactional
    public GrammarReview reviewGrammar(User user, Long grammarId, int quality) {
        if (quality < 1 || quality > 4) {
            throw new IllegalArgumentException("Quality rating must be between 1 and 4");
        }

        GrammarCard grammarCard = grammarCardRepository.findById(grammarId)
                .orElseThrow(() -> new IllegalArgumentException("Grammar card not found"));

        GrammarReview review = grammarReviewRepository.findByUserIdAndGrammarCardId(user.getId(), grammarId)
                .orElseGet(() -> new GrammarReview(user, grammarCard));

        // Map 1-4 scale to SM-2 0-5 scale
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

        if (quality >= 3) { // Good or Easy (learned)
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
            review.setLearned(true);
        } else { // Forgot (1) or Hard (2) (failed)
            repetitions = 0;
            if (review.getIntervalDays() > 0) {
                intervalDays = 1; // Keep it as learned (interval 1 day)
            } else {
                intervalDays = 0; // Not learned yet
            }
        }

        // Adjust Ease Factor (EF)
        easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        if (easeFactor < 1.3) {
            easeFactor = 1.3;
        }

        review.setEaseFactor(easeFactor);
        review.setRepetitions(repetitions);
        review.setIntervalDays(intervalDays);

        // Schedule next review date
        Instant nextReview = (intervalDays == 0)
                ? Instant.now()
                : Instant.now().plus(intervalDays, ChronoUnit.DAYS);
        review.setNextReview(nextReview);

        return grammarReviewRepository.save(review);
    }

    /**
     * Get a random list of already learned grammar cards for review quiz.
     */
    @Transactional(readOnly = true)
    public List<GrammarCard> getRandomLearnedGrammar(User user, int count) {
        List<GrammarReview> learned = grammarReviewRepository.findByUserIdAndIsLearned(user.getId(), true);
        if (learned.isEmpty()) {
            return Collections.emptyList();
        }
        Collections.shuffle(learned);
        return learned.stream()
                .limit(count)
                .map(GrammarReview::getGrammarCard)
                .collect(Collectors.toList());
    }
}
