package com.flashcard.exam.dto;

import java.util.List;

public class ExamDetailDto {

    private String examId;
    private String level;
    private int year;
    private int month;
    private String title;
    private int totalQuestions;
    private String audioFile;
    private List<SectionDto> sections;

    // ── Constructors ───────────────────────────────────────────────────────────

    public ExamDetailDto() {}

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

    public String getAudioFile() { return audioFile; }
    public void setAudioFile(String audioFile) { this.audioFile = audioFile; }

    public List<SectionDto> getSections() { return sections; }
    public void setSections(List<SectionDto> sections) { this.sections = sections; }
}
