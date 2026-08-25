package com.flashcard.knowledge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_lesson_quizzes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"chapter_id", "lesson_id"})
})
public class JlptN3LessonQuiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Integer chapterId;

    @Column(name = "lesson_id", nullable = false)
    private Integer lessonId;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions = 20;

    @Column(name = "questions_json", columnDefinition = "LONGTEXT", nullable = false)
    private String questionsJson;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public JlptN3LessonQuiz() {
    }

    public JlptN3LessonQuiz(Integer chapterId, Integer lessonId, Integer totalQuestions, String questionsJson) {
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.totalQuestions = totalQuestions;
        this.questionsJson = questionsJson;
        this.updatedAt = LocalDateTime.now();
    }

    // Pure Getters and Setters (NO Lombok per AGENTS.md rule)
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

    public Integer getTotalQuestions() {
        return totalQuestions != null ? totalQuestions : 0;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public String getQuestionsJson() {
        return questionsJson;
    }

    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
