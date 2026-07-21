package com.flashcard.knowledge.model;

import com.flashcard.user.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "speaking_statistics")
public class SpeakingStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "grammar_accuracy", nullable = false)
    private Double grammarAccuracy = 0.0;

    @Column(name = "vocabulary_score", nullable = false)
    private Double vocabularyScore = 0.0;

    @Column(name = "fluency_score", nullable = false)
    private Double fluencyScore = 0.0;

    @Column(name = "confidence_score", nullable = false)
    private Double confidenceScore = 0.0;

    @Column(name = "total_sessions", nullable = false)
    private Integer totalSessions = 0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public SpeakingStatistics() {}

    public SpeakingStatistics(User user) {
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Double getGrammarAccuracy() {
        return grammarAccuracy;
    }

    public void setGrammarAccuracy(Double grammarAccuracy) {
        this.grammarAccuracy = grammarAccuracy;
    }

    public Double getVocabularyScore() {
        return vocabularyScore;
    }

    public void setVocabularyScore(Double vocabularyScore) {
        this.vocabularyScore = vocabularyScore;
    }

    public Double getFluencyScore() {
        return fluencyScore;
    }

    public void setFluencyScore(Double fluencyScore) {
        this.fluencyScore = fluencyScore;
    }

    public Double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public Integer getTotalSessions() {
        return totalSessions;
    }

    public void setTotalSessions(Integer totalSessions) {
        this.totalSessions = totalSessions;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

