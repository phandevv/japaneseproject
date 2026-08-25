package com.flashcard.knowledge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_progress", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "chapter_id", "lesson_id"})
})
public class JlptN3Progress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "chapter_id", nullable = false)
    private Integer chapterId;

    @Column(name = "lesson_id", nullable = false)
    private Integer lessonId;

    @Column(name = "vocab_passed")
    private Boolean vocabPassed = false;

    @Column(name = "kanji_passed")
    private Boolean kanjiPassed = false;

    @Column(name = "grammar_passed")
    private Boolean grammarPassed = false;

    @Column(name = "quiz_passed")
    private Boolean quizPassed = false;

    @Column(name = "completed", nullable = false)
    private Boolean completed = false;

    @Column(name = "best_score", nullable = false)
    private Integer bestScore = 0;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public JlptN3Progress() {
    }

    public JlptN3Progress(Long userId, Integer chapterId, Integer lessonId, Boolean completed, Integer bestScore) {
        this.userId = userId;
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.completed = completed;
        this.bestScore = bestScore;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Pure Getters and Setters (NO Lombok per AGENTS.md)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getChapterId() {
        return chapterId;
    }

    public void setChapterId(Integer chapterId) {
        this.chapterId = chapterId;
    }

    public Integer getLessonId() {
        return lessonId;
    }

    public void setLessonId(Integer lessonId) {
        this.lessonId = lessonId;
    }

    public Boolean getVocabPassed() {
        return vocabPassed != null ? vocabPassed : false;
    }

    public void setVocabPassed(Boolean vocabPassed) {
        this.vocabPassed = vocabPassed;
    }

    public Boolean getKanjiPassed() {
        return kanjiPassed != null ? kanjiPassed : false;
    }

    public void setKanjiPassed(Boolean kanjiPassed) {
        this.kanjiPassed = kanjiPassed;
    }

    public Boolean getGrammarPassed() {
        return grammarPassed != null ? grammarPassed : false;
    }

    public void setGrammarPassed(Boolean grammarPassed) {
        this.grammarPassed = grammarPassed;
    }

    public Boolean getQuizPassed() {
        return quizPassed != null ? quizPassed : false;
    }

    public void setQuizPassed(Boolean quizPassed) {
        this.quizPassed = quizPassed;
    }

    public Boolean getCompleted() {
        return completed;
    }

    public void setCompleted(Boolean completed) {
        this.completed = completed;
    }

    public Integer getBestScore() {
        return bestScore;
    }

    public void setBestScore(Integer bestScore) {
        this.bestScore = bestScore;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
