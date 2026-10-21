package com.flashcard.exam.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mock_exam_answers")
public class MockExamAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "section_id", nullable = false, length = 50)
    private String sectionId;

    @Column(name = "question_id", nullable = false, length = 100)
    private String questionId;

    @Column(name = "selected_choice")
    private Integer selectedChoice;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // ── Constructors ───────────────────────────────────────────────────────────

    public MockExamAnswer() {}

    public MockExamAnswer(Long attemptId, String sectionId, String questionId,
                          Integer selectedChoice, Boolean correct) {
        this.attemptId = attemptId;
        this.sectionId = sectionId;
        this.questionId = questionId;
        this.selectedChoice = selectedChoice;
        this.correct = correct;
        this.createdAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }

    public Integer getSelectedChoice() { return selectedChoice; }
    public void setSelectedChoice(Integer selectedChoice) { this.selectedChoice = selectedChoice; }

    public Boolean getCorrect() { return correct; }
    public void setCorrect(Boolean correct) { this.correct = correct; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
