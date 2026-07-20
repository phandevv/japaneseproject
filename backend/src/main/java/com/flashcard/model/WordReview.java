package com.flashcard.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "word_reviews", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "vocabulary_id"})
}, indexes = {
    @Index(name = "idx_user_last_reviewed", columnList = "user_id, last_reviewed_at"),
    @Index(name = "idx_user_last_rating", columnList = "user_id, last_rating")
})
public class WordReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vocabulary_id", nullable = false)
    private Vocabulary vocabulary;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false)
    private WordReviewState state = WordReviewState.NEW;

    @Column(name = "difficulty", nullable = false)
    private float difficulty = 0.0f;

    @Column(name = "stability", nullable = false)
    private float stability = 0.0f;

    @Column(name = "ease_factor", nullable = false)
    private double easeFactor = 2.5;

    @Column(name = "interval_days", nullable = false)
    private int intervalDays = 0;

    @Column(name = "repetitions", nullable = false)
    private int repetitions = 0;

    @Column(name = "review_count", nullable = false)
    private int reviewCount = 0;

    @Column(name = "correct_count", nullable = false)
    private int correctCount = 0;

    @Column(name = "wrong_count", nullable = false)
    private int wrongCount = 0;

    @Column(name = "consecutive_correct", nullable = false)
    private int consecutiveCorrect = 0;

    @Column(name = "next_review", nullable = false)
    private Instant nextReview = Instant.now();

    @Column(name = "last_reviewed_at")
    private Instant lastReviewedAt;

    @Column(name = "last_rating")
    private Integer lastRating;

    public WordReview() {}

    public WordReview(User user, Vocabulary vocabulary) {
        this.user = user;
        this.vocabulary = vocabulary;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Vocabulary getVocabulary() { return vocabulary; }
    public void setVocabulary(Vocabulary vocabulary) { this.vocabulary = vocabulary; }

    public WordReviewState getState() { return state; }
    public void setState(WordReviewState state) { this.state = state; }

    public float getDifficulty() { return difficulty; }
    public void setDifficulty(float difficulty) { this.difficulty = difficulty; }

    public float getStability() { return stability; }
    public void setStability(float stability) { this.stability = stability; }

    public double getEaseFactor() { return easeFactor; }
    public void setEaseFactor(double easeFactor) { this.easeFactor = easeFactor; }

    public int getIntervalDays() { return intervalDays; }
    public void setIntervalDays(int intervalDays) { this.intervalDays = intervalDays; }

    public int getRepetitions() { return repetitions; }
    public void setRepetitions(int repetitions) { this.repetitions = repetitions; }

    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public int getCorrectCount() { return correctCount; }
    public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }

    public int getWrongCount() { return wrongCount; }
    public void setWrongCount(int wrongCount) { this.wrongCount = wrongCount; }


    public int getConsecutiveCorrect() { return consecutiveCorrect; }
    public void setConsecutiveCorrect(int consecutiveCorrect) { this.consecutiveCorrect = consecutiveCorrect; }

    public Instant getNextReview() { return nextReview; }
    public void setNextReview(Instant nextReview) { this.nextReview = nextReview; }

    public Instant getLastReviewedAt() { return lastReviewedAt; }
    public void setLastReviewedAt(Instant lastReviewedAt) { this.lastReviewedAt = lastReviewedAt; }

    public Integer getLastRating() { return lastRating; }
    public void setLastRating(Integer lastRating) { this.lastRating = lastRating; }
}
