package com.flashcard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "daily_study_stats", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "date"})
})
public class DailyStudyStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "new_words_studied")
    private int newWordsStudied = 0;

    @Column(name = "words_reviewed")
    private int wordsReviewed = 0;

    @Column(name = "retention_rate")
    private float retentionRate = 0.0f;

    @Column(name = "learning_time_ms")
    private long learningTimeMs = 0;

    public DailyStudyStats() {}

    public DailyStudyStats(User user, LocalDate date) {
        this.user = user;
        this.date = date;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public int getNewWordsStudied() { return newWordsStudied; }
    public void setNewWordsStudied(int newWordsStudied) { this.newWordsStudied = newWordsStudied; }

    public int getWordsReviewed() { return wordsReviewed; }
    public void setWordsReviewed(int wordsReviewed) { this.wordsReviewed = wordsReviewed; }

    public float getRetentionRate() { return retentionRate; }
    public void setRetentionRate(float retentionRate) { this.retentionRate = retentionRate; }

    public long getLearningTimeMs() { return learningTimeMs; }
    public void setLearningTimeMs(long learningTimeMs) { this.learningTimeMs = learningTimeMs; }
}
