package com.flashcard.exam.document;

import java.util.ArrayList;
import java.util.List;

public class ExamSectionDoc {

    private String id;
    private String sectionType;
    private String title;
    private Integer timeLimitMinutes;
    private Integer orderIndex;
    private List<ExamQuestionDoc> questions;

    public ExamSectionDoc() {
        this.questions = new ArrayList<>();
    }

    public ExamSectionDoc(String id, String sectionType, String title, Integer timeLimitMinutes,
                          Integer orderIndex, List<ExamQuestionDoc> questions) {
        this.id = id;
        this.sectionType = sectionType;
        this.title = title;
        this.timeLimitMinutes = timeLimitMinutes;
        this.orderIndex = orderIndex;
        this.questions = (questions != null) ? questions : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSectionType() {
        return sectionType;
    }

    public void setSectionType(String sectionType) {
        this.sectionType = sectionType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }

    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public List<ExamQuestionDoc> getQuestions() {
        return questions;
    }

    public void setQuestions(List<ExamQuestionDoc> questions) {
        this.questions = questions;
    }
}
