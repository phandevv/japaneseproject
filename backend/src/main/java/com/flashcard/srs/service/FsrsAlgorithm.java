package com.flashcard.srs.service;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class FsrsAlgorithm implements SpacedRepetitionAlgorithm {

    // Maximum allowed interval (365 days = 1 year max cap)
    private static final int MAX_INTERVAL = 365;

    // FSRS v4.5 standard weights:
    // w[0..3]: Initial stabilities for AGAIN (0.4), HARD (1.2), GOOD (2.4), EASY (5.8)
    // w[4]: Initial difficulty for GOOD (4.93)
    // w[5]: Initial difficulty scale (0.94)
    // w[6]: Difficulty change weight (0.86)
    // w[7]: Mean reversion weight (0.01)
    // w[8]: Stability growth factor (1.49)
    // w[9]: Stability decay exponent (0.14)
    // w[10]: Retrievability exponent (0.94)
    // w[11]: Forget stability factor (2.18)
    // w[12]: Forget difficulty decay (0.05)
    // w[13]: Forget stability decay (0.34)
    // w[14]: Forget retrievability factor (1.26)
    // w[15]: Hard penalty (0.29)
    // w[16]: Easy bonus (2.61)
    private static final float[] w = {
            0.4f, 1.2f, 2.4f, 5.8f, 4.93f, 0.94f, 0.86f, 0.01f,
            1.49f, 0.14f, 0.94f, 2.18f, 0.05f, 0.34f, 1.26f, 0.29f, 2.61f
    };

    @Override
    public void calculateNextState(WordReview currentReview, ReviewRating rating) {
        WordReviewState currentState = currentReview.getState();

        // Sanitize and clamp state values before calculation
        if (currentReview.getDifficulty() <= 0f || Float.isNaN(currentReview.getDifficulty())) {
            currentReview.setDifficulty(4.93f);
        }
        if (currentReview.getStability() <= 0f || Float.isNaN(currentReview.getStability())) {
            currentReview.setStability(0.4f);
        }
        if (currentReview.getStability() > MAX_INTERVAL) {
            currentReview.setStability(MAX_INTERVAL);
        }

        if (currentState == WordReviewState.NEW) {
            initNewCard(currentReview, rating);
        } else {
            updateCard(currentReview, rating);
        }

        // Update statistics
        currentReview.setReviewCount(currentReview.getReviewCount() + 1);

        if (rating == ReviewRating.AGAIN) {
            currentReview.setWrongCount(currentReview.getWrongCount() + 1);
            currentReview.setConsecutiveCorrect(0);
        } else {
            currentReview.setCorrectCount(currentReview.getCorrectCount() + 1);
            currentReview.setConsecutiveCorrect(currentReview.getConsecutiveCorrect() + 1);
        }

        // Cap maximum interval
        int interval = Math.min(Math.max(currentReview.getIntervalDays(), 1), MAX_INTERVAL);
        currentReview.setIntervalDays(interval);

        // Next review date calculation
        currentReview.setNextReview(Instant.now().plus(interval, ChronoUnit.DAYS));
        currentReview.setLastReviewedAt(Instant.now());
        currentReview.setLastRating(rating.getValue());
    }

    private void initNewCard(WordReview review, ReviewRating rating) {
        float difficulty = w[4] - (rating.getValue() - 3) * w[5];
        float stability = switch (rating) {
            case AGAIN -> w[0]; // 0.4d
            case HARD -> w[1];  // 1.2d
            case GOOD -> w[2];  // 2.4d
            case EASY -> w[3];  // 5.8d
        };
        int interval = switch (rating) {
            case AGAIN -> 1;
            case HARD -> 1;
            case GOOD -> 2;
            case EASY -> 4;
        };

        if (rating == ReviewRating.EASY) {
            review.setState(WordReviewState.MATURE);
        } else {
            review.setState(WordReviewState.LEARNING);
        }

        review.setDifficulty(Math.min(Math.max(difficulty, 1f), 10f));
        review.setStability(Math.min(Math.max(stability, 0.1f), MAX_INTERVAL));
        review.setIntervalDays(interval);
    }

    private void updateCard(WordReview review, ReviewRating rating) {
        float currentD = review.getDifficulty();
        float currentS = review.getStability();

        // Calculate elapsed time (days) since last review
        float elapsedDays = currentS;
        if (review.getLastReviewedAt() != null) {
            long days = ChronoUnit.DAYS.between(review.getLastReviewedAt(), Instant.now());
            if (days > 0) elapsedDays = (float) days;
        }

        // Retrievability R = exp(ln(0.9) * elapsedDays / currentS)
        float R = (float) Math.exp(Math.log(0.9) * (elapsedDays / Math.max(currentS, 0.1f)));
        R = Math.min(Math.max(R, 0.01f), 0.99f);

        float nextD = nextDifficulty(currentD, rating);
        float nextS;
        int nextInterval;

        if (rating == ReviewRating.AGAIN) {
            nextS = nextForgetStability(currentD, currentS, R);
            nextInterval = 1;
            review.setState(WordReviewState.LEARNING);
        } else {
            nextS = nextRecallStability(currentD, currentS, R, rating);
            nextInterval = (int) Math.round(nextS);

            if (review.getState() != WordReviewState.MATURE && nextInterval >= 21) {
                review.setState(WordReviewState.MATURE);
            }
        }

        review.setDifficulty(nextD);
        review.setStability(Math.min(Math.max(nextS, 0.1f), MAX_INTERVAL));
        review.setIntervalDays(Math.min(Math.max(nextInterval, 1), MAX_INTERVAL));
    }

    private float nextDifficulty(float d, ReviewRating rating) {
        float nextD = w[7] * w[4] + (1 - w[7]) * (d - w[6] * (rating.getValue() - 3));
        return Math.min(Math.max(nextD, 1f), 10f);
    }

    private float nextRecallStability(float d, float s, float R, ReviewRating rating) {
        float hardPenalty = (rating == ReviewRating.HARD) ? w[15] : 1f;
        float easyBonus = (rating == ReviewRating.EASY) ? w[16] : 1f;

        float growth = (float) Math.exp(w[8]) * (11f - d) *
                       (float) Math.pow(s, -w[9]) *
                       ((float) Math.exp(w[10] * (1f - R)) - 1f) * hardPenalty * easyBonus;

        float nextS = s * (1f + Math.max(growth, 0.1f));
        return Math.min(Math.max(nextS, 0.1f), MAX_INTERVAL);
    }

    private float nextForgetStability(float d, float s, float R) {
        float nextS = w[11] * (float) Math.pow(d, -w[12]) *
                      (float) Math.pow(s + 1f, w[13]) *
                      (float) Math.exp(w[14] * (1f - R));
        return Math.min(Math.max(nextS, 0.1f), MAX_INTERVAL);
    }

    @Override
    public java.util.Map<String, Integer> getProjectedIntervals(WordReview currentReview) {
        java.util.Map<String, Integer> projections = new java.util.HashMap<>();
        ReviewRating[] ratings = {ReviewRating.AGAIN, ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY};

        for (ReviewRating rating : ratings) {
            WordReview clone = new WordReview();
            clone.setState(currentReview.getState());
            clone.setDifficulty(currentReview.getDifficulty());
            clone.setStability(currentReview.getStability());
            clone.setIntervalDays(currentReview.getIntervalDays());
            clone.setReviewCount(currentReview.getReviewCount());
            clone.setConsecutiveCorrect(currentReview.getConsecutiveCorrect());
            clone.setLastReviewedAt(currentReview.getLastReviewedAt());

            calculateNextState(clone, rating);

            projections.put(rating.name(), clone.getIntervalDays());
        }

        return projections;
    }
}

