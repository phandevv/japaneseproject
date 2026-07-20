package com.flashcard.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "review_logs")
public class ReviewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_review_id", nullable = false)
    private WordReview wordReview;

    @Enumerated(EnumType.STRING)
    @Column(name = "rating", nullable = false)
    private ReviewRating rating;

    @Enumerated(EnumType.STRING)
    @Column(name = "state_before")
    private WordReviewState stateBefore;

    @Enumerated(EnumType.STRING)
    @Column(name = "state_after")
    private WordReviewState stateAfter;

    @Column(name = "difficulty_before")
    private float difficultyBefore;

    @Column(name = "difficulty_after")
    private float difficultyAfter;

    @Column(name = "stability_before")
    private float stabilityBefore;

    @Column(name = "stability_after")
    private float stabilityAfter;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ReviewLog() {}

    public ReviewLog(WordReview wordReview, ReviewRating rating) {
        this.wordReview = wordReview;
        this.rating = rating;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public WordReview getWordReview() { return wordReview; }
    public void setWordReview(WordReview wordReview) { this.wordReview = wordReview; }

    public ReviewRating getRating() { return rating; }
    public void setRating(ReviewRating rating) { this.rating = rating; }

    public WordReviewState getStateBefore() { return stateBefore; }
    public void setStateBefore(WordReviewState stateBefore) { this.stateBefore = stateBefore; }

    public WordReviewState getStateAfter() { return stateAfter; }
    public void setStateAfter(WordReviewState stateAfter) { this.stateAfter = stateAfter; }

    public float getDifficultyBefore() { return difficultyBefore; }
    public void setDifficultyBefore(float difficultyBefore) { this.difficultyBefore = difficultyBefore; }

    public float getDifficultyAfter() { return difficultyAfter; }
    public void setDifficultyAfter(float difficultyAfter) { this.difficultyAfter = difficultyAfter; }

    public float getStabilityBefore() { return stabilityBefore; }
    public void setStabilityBefore(float stabilityBefore) { this.stabilityBefore = stabilityBefore; }

    public float getStabilityAfter() { return stabilityAfter; }
    public void setStabilityAfter(float stabilityAfter) { this.stabilityAfter = stabilityAfter; }

    public Integer getDurationMs() { return durationMs; }
    public void setDurationMs(Integer durationMs) { this.durationMs = durationMs; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
