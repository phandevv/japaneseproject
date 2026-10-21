package com.flashcard.knowledge.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.flashcard.user.model.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "high_frequency_grammar_reviews", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "grammar_id"})
})
public class HighFrequencyGrammarReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grammar_id", nullable = false)
    private HighFrequencyGrammar grammar;

    @Column(name = "ease_factor", nullable = false)
    private double easeFactor = 2.5;

    @Column(name = "interval_days", nullable = false)
    private int intervalDays = 0;

    @Column(name = "repetitions", nullable = false)
    private int repetitions = 0;

    @Column(name = "next_review", nullable = false)
    private Instant nextReview = Instant.now();

    @Column(name = "is_learned", nullable = false)
    private boolean isLearned = false;

    @Column(name = "last_quality")
    private Integer lastQuality;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public HighFrequencyGrammarReview() {}

    public HighFrequencyGrammarReview(User user, HighFrequencyGrammar grammar) {
        this.user = user;
        this.grammar = grammar;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public HighFrequencyGrammar getGrammar() { return grammar; }
    public void setGrammar(HighFrequencyGrammar grammar) { this.grammar = grammar; }

    public double getEaseFactor() { return easeFactor; }
    public void setEaseFactor(double easeFactor) { this.easeFactor = easeFactor; }

    public int getIntervalDays() { return intervalDays; }
    public void setIntervalDays(int intervalDays) { this.intervalDays = intervalDays; }

    public int getRepetitions() { return repetitions; }
    public void setRepetitions(int repetitions) { this.repetitions = repetitions; }

    public Instant getNextReview() { return nextReview; }
    public void setNextReview(Instant nextReview) { this.nextReview = nextReview; }

    public boolean isLearned() { return isLearned; }
    public void setLearned(boolean learned) { isLearned = learned; }

    public Integer getLastQuality() { return lastQuality; }
    public void setLastQuality(Integer lastQuality) { this.lastQuality = lastQuality; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
