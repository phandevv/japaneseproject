package com.flashcard.exam.dto;

import java.util.List;

public class SectionResultDto {

    private String sectionId;
    private String title;
    private String titleVi;
    private int totalQuestions;
    private int correctCount;
    private double percentage;
    private List<QuestionReviewDto> questions;

    public SectionResultDto() {}

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTitleVi() { return titleVi; }
    public void setTitleVi(String titleVi) { this.titleVi = titleVi; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public int getCorrectCount() { return correctCount; }
    public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }

    public List<QuestionReviewDto> getQuestions() { return questions; }
    public void setQuestions(List<QuestionReviewDto> questions) { this.questions = questions; }
}
