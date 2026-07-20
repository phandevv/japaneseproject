package com.flashcard.service;

import com.flashcard.model.ReviewRating;
import com.flashcard.model.WordReview;

public interface SpacedRepetitionAlgorithm {
    /**
     * Calculates the next state (difficulty, stability, interval, next_review_at)
     * based on the current state and the user's rating.
     */
    void calculateNextState(WordReview currentReview, ReviewRating rating);
}
