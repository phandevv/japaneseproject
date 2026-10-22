package com.flashcard.exam.dto;

import java.util.Map;

public class SubmitSectionRequest {

    private String sectionId;
    private Map<String, Integer> answers;

    public SubmitSectionRequest() {}

    public SubmitSectionRequest(String sectionId, Map<String, Integer> answers) {
        this.sectionId = sectionId;
        this.answers = answers;
    }

    public String getSectionId() {
        return sectionId;
    }

    public void setSectionId(String sectionId) {
        this.sectionId = sectionId;
    }

    public Map<String, Integer> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<String, Integer> answers) {
        this.answers = answers;
    }
}
