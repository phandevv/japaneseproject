package com.flashcard.knowledge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_readings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"chapter_id", "lesson_id"})
})
public class JlptN3Reading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Integer chapterId;

    @Column(name = "lesson_id", nullable = false)
    private Integer lessonId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "passage", columnDefinition = "LONGTEXT", nullable = false)
    private String passage;

    @Column(name = "translation", columnDefinition = "LONGTEXT")
    private String translation;

    @Column(name = "questions_json", columnDefinition = "LONGTEXT", nullable = false)
    private String questionsJson;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public JlptN3Reading() {
    }

    public JlptN3Reading(Integer chapterId, Integer lessonId, String title, String passage, String translation, String questionsJson) {
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.title = title;
        this.passage = passage;
        this.translation = translation;
        this.questionsJson = questionsJson;
        this.updatedAt = LocalDateTime.now();
    }

    // Pure Getters and Setters (NO Lombok)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPassage() {
        return passage;
    }

    public void setPassage(String passage) {
        this.passage = passage;
    }

    public String getTranslation() {
        return translation;
    }

    public void setTranslation(String translation) {
        this.translation = translation;
    }

    public String getQuestionsJson() {
        return questionsJson;
    }

    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
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
