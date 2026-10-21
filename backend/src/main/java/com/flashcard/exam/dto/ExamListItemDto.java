package com.flashcard.exam.dto;

/**
 * Lightweight summary for listing exams on the exam list page.
 */
public class ExamListItemDto {

    private String examId;
    private String level;
    private int year;
    private int month;
    private String title;
    private int totalQuestions;
    private int totalSections;
    private int totalTimeSec;

    // User-specific attempt info (optional, populated when user is authenticated)
    private String userAttemptStatus;
    private Double userLastScore;
    private Long userLastAttemptId;

    // ── Constructors ───────────────────────────────────────────────────────────

    public ExamListItemDto() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public int getTotalSections() { return totalSections; }
    public void setTotalSections(int totalSections) { this.totalSections = totalSections; }

    public int getTotalTimeSec() { return totalTimeSec; }
    public void setTotalTimeSec(int totalTimeSec) { this.totalTimeSec = totalTimeSec; }

    public String getUserAttemptStatus() { return userAttemptStatus; }
    public void setUserAttemptStatus(String userAttemptStatus) { this.userAttemptStatus = userAttemptStatus; }

    public Double getUserLastScore() { return userLastScore; }
    public void setUserLastScore(Double userLastScore) { this.userLastScore = userLastScore; }

    public Long getUserLastAttemptId() { return userLastAttemptId; }
    public void setUserLastAttemptId(Long userLastAttemptId) { this.userLastAttemptId = userLastAttemptId; }
}
