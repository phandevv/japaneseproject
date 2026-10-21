package com.flashcard.exam.dto;

import java.util.List;

public class AttemptResultDto {

    private Long attemptId;
    private String examId;
    private String examTitle;
    private String status;
    private int totalCorrect;
    private int totalQuestions;
    private double percentage;
    private List<SectionResultDto> sectionResults;

    // ── Constructors ───────────────────────────────────────────────────────────

    public AttemptResultDto() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getExamTitle() { return examTitle; }
    public void setExamTitle(String examTitle) { this.examTitle = examTitle; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getTotalCorrect() { return totalCorrect; }
    public void setTotalCorrect(int totalCorrect) { this.totalCorrect = totalCorrect; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public List<SectionResultDto> getSectionResults() { return sectionResults; }
    public void setSectionResults(List<SectionResultDto> sectionResults) { this.sectionResults = sectionResults; }
}
