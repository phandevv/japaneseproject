package com.flashcard.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "word_reviews", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "vocabulary_id"})
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

    @Column(name = "ease_factor", nullable = false)
    private double easeFactor = 2.5;

    @Column(name = "interval_days", nullable = false)
    private int intervalDays = 0;

    @Column(name = "repetitions", nullable = false)
    private int repetitions = 0;

    @Column(name = "next_review", nullable = false)
    private Instant nextReview = Instant.now();

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

    public double getEaseFactor() { return easeFactor; }
    public void setEaseFactor(double easeFactor) { this.easeFactor = easeFactor; }

    public int getIntervalDays() { return intervalDays; }
    public void setIntervalDays(int intervalDays) { this.intervalDays = intervalDays; }

    public int getRepetitions() { return repetitions; }
    public void setRepetitions(int repetitions) { this.repetitions = repetitions; }

    public Instant getNextReview() { return nextReview; }
    public void setNextReview(Instant nextReview) { this.nextReview = nextReview; }
}
