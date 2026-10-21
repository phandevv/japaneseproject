package com.flashcard.exam.document;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.ArrayList;
import java.util.List;

public class ExamSectionDoc {

    @Field("id")
    private String id;

    @Field("_id")
    private String underscoreId;

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
        this.underscoreId = id;
        this.sectionType = sectionType;
        this.title = title;
        this.timeLimitMinutes = timeLimitMinutes;
        this.orderIndex = orderIndex;
        this.questions = (questions != null) ? questions : new ArrayList<>();
    }

    public String getId() {
        if (id != null && !id.isBlank()) return id;
        return underscoreId;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUnderscoreId() {
        return underscoreId;
    }

    public void setUnderscoreId(String underscoreId) {
        this.underscoreId = underscoreId;
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
