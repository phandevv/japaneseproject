package com.flashcard.exam.dto;

import java.util.List;

public class SectionDto {

    private String sectionId;
    private String title;
    private String titleVi;
    private int timeLimitSec;
    private int totalQuestions;
    private List<QuestionDto> questions;

    // ── Constructors ───────────────────────────────────────────────────────────

    public SectionDto() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTitleVi() { return titleVi; }
    public void setTitleVi(String titleVi) { this.titleVi = titleVi; }

    public int getTimeLimitSec() { return timeLimitSec; }
    public void setTimeLimitSec(int timeLimitSec) { this.timeLimitSec = timeLimitSec; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public List<QuestionDto> getQuestions() { return questions; }
    public void setQuestions(List<QuestionDto> questions) { this.questions = questions; }
}
