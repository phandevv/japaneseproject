package com.flashcard.exam.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class AttemptDto {

    private Long attemptId;
    private String examId;
    private String status;
    private int currentSectionIndex;
    private int sectionTimeLeftSec;
    private LocalDateTime startedAt;
    private Map<String, Integer> savedAnswers;
    private ExamDetailDto exam;

    public AttemptDto() {}

    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getCurrentSectionIndex() { return currentSectionIndex; }
    public void setCurrentSectionIndex(int currentSectionIndex) { this.currentSectionIndex = currentSectionIndex; }

    public int getSectionTimeLeftSec() { return sectionTimeLeftSec; }
    public void setSectionTimeLeftSec(int sectionTimeLeftSec) { this.sectionTimeLeftSec = sectionTimeLeftSec; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public Map<String, Integer> getSavedAnswers() { return savedAnswers; }
    public void setSavedAnswers(Map<String, Integer> savedAnswers) { this.savedAnswers = savedAnswers; }

    public ExamDetailDto getExam() { return exam; }
    public void setExam(ExamDetailDto exam) { this.exam = exam; }
}
