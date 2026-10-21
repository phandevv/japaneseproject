package com.flashcard.exam.dto;

import java.time.LocalDateTime;

public class AttemptHistoryDto {

    private Long attemptId;
    private String examId;
    private String examTitle;
    private String level;
    private int year;
    private int month;
    private String status;
    private int totalCorrect;
    private int totalQuestions;
    private double percentage;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public AttemptHistoryDto() {}

    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getExamTitle() { return examTitle; }
    public void setExamTitle(String examTitle) { this.examTitle = examTitle; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getTotalCorrect() { return totalCorrect; }
    public void setTotalCorrect(int totalCorrect) { this.totalCorrect = totalCorrect; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
