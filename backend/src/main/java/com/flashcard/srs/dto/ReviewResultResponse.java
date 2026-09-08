package com.flashcard.srs.dto;

import com.flashcard.srs.model.ReviewRating;
import com.flashcard.srs.model.WordReviewState;

import java.time.Instant;

public class ReviewResultResponse {
    private Long cardId;
    private Long vocabularyId;
    private ReviewRating rating;
    private Instant previousDueAt;
    private Instant nextDueAt;
    private WordReviewState state;
    private int intervalDays;
    private float stability;
    private float difficulty;

    public ReviewResultResponse() {}

    public Long getCardId() {
        return cardId;
    }

    public void setCardId(Long cardId) {
        this.cardId = cardId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public ReviewRating getRating() {
        return rating;
    }

    public void setRating(ReviewRating rating) {
        this.rating = rating;
    }

    public Instant getPreviousDueAt() {
        return previousDueAt;
    }

    public void setPreviousDueAt(Instant previousDueAt) {
        this.previousDueAt = previousDueAt;
    }

    public Instant getNextDueAt() {
        return nextDueAt;
    }

    public void setNextDueAt(Instant nextDueAt) {
        this.nextDueAt = nextDueAt;
    }

    public WordReviewState getState() {
        return state;
    }

    public void setState(WordReviewState state) {
        this.state = state;
    }

    public int getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(int intervalDays) {
        this.intervalDays = intervalDays;
    }

    public float getStability() {
        return stability;
    }

    public void setStability(float stability) {
        this.stability = stability;
    }

    public float getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(float difficulty) {
        this.difficulty = difficulty;
    }
}
