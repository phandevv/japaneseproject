package com.flashcard.exam.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mock_exam_attempts")
public class MockExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "exam_id", nullable = false, length = 50)
    private String examId;

    @Column(name = "level", nullable = false, length = 10)
    private String level;

    @Column(name = "exam_year", nullable = false)
    private Integer examYear;

    @Column(name = "exam_month", nullable = false)
    private Integer examMonth;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "IN_PROGRESS";

    @Column(name = "current_section_index", nullable = false)
    private Integer currentSectionIndex = 0;

    @Column(name = "section_time_left_sec", nullable = false)
    private Integer sectionTimeLeftSec = 0;

    @Column(name = "total_correct", nullable = false)
    private Integer totalCorrect = 0;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions = 0;

    @Column(name = "percentage", nullable = false)
    private Double percentage = 0.0;

    @Column(name = "section_results_json", columnDefinition = "TEXT")
    private String sectionResultsJson;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // ── Constructors ───────────────────────────────────────────────────────────

    public MockExamAttempt() {}

    public MockExamAttempt(Long userId, String examId, String level,
                           Integer examYear, Integer examMonth, Integer totalQuestions) {
        this.userId = userId;
        this.examId = examId;
        this.level = level;
        this.examYear = examYear;
        this.examMonth = examMonth;
        this.totalQuestions = totalQuestions;
        this.startedAt = LocalDateTime.now();
        this.status = "IN_PROGRESS";
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public Integer getExamYear() { return examYear; }
    public void setExamYear(Integer examYear) { this.examYear = examYear; }

    public Integer getExamMonth() { return examMonth; }
    public void setExamMonth(Integer examMonth) { this.examMonth = examMonth; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getCurrentSectionIndex() { return currentSectionIndex; }
    public void setCurrentSectionIndex(Integer currentSectionIndex) { this.currentSectionIndex = currentSectionIndex; }

    public Integer getSectionTimeLeftSec() { return sectionTimeLeftSec; }
    public void setSectionTimeLeftSec(Integer sectionTimeLeftSec) { this.sectionTimeLeftSec = sectionTimeLeftSec; }

    public Integer getTotalCorrect() { return totalCorrect; }
    public void setTotalCorrect(Integer totalCorrect) { this.totalCorrect = totalCorrect; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }

    public String getSectionResultsJson() { return sectionResultsJson; }
    public void setSectionResultsJson(String sectionResultsJson) { this.sectionResultsJson = sectionResultsJson; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
