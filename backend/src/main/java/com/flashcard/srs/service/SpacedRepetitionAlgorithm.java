package com.flashcard.srs.service;

import com.flashcard.user.model.User;
import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReview;

public interface SpacedRepetitionAlgorithm {
    /**
     * Calculates the next state (difficulty, stability, interval, next_review_at)
     * based on the current state and the user's rating.
     */
    void calculateNextState(WordReview currentReview, ReviewRating rating);

    /**
     * Projects the resulting intervals (in days) for each possible rating
     * without actually modifying the WordReview state.
     * Returns a map of rating name to projected interval in days.
     */
    java.util.Map<String, Integer> getProjectedIntervals(WordReview currentReview);
}

