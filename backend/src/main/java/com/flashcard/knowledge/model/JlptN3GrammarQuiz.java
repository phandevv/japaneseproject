package com.flashcard.knowledge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_grammar_quizzes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"chapter_id", "lesson_id"})
})
public class JlptN3GrammarQuiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Integer chapterId;

    @Column(name = "lesson_id", nullable = false)
    private Integer lessonId;

    @Column(name = "questions_json", columnDefinition = "LONGTEXT", nullable = false)
    private String questionsJson;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public JlptN3GrammarQuiz() {
    }

    public JlptN3GrammarQuiz(Integer chapterId, Integer lessonId, String questionsJson) {
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.questionsJson = questionsJson;
    }

    // Pure Getters and Setters (No Lombok)
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
}
