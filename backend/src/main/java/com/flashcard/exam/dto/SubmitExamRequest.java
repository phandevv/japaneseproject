package com.flashcard.exam.dto;

import java.util.Map;

public class SubmitExamRequest {

    private Map<String, Integer> answers;

    public SubmitExamRequest() {}

    public SubmitExamRequest(Map<String, Integer> answers) {
        this.answers = answers;
    }

    public Map<String, Integer> getAnswers() { return answers; }
    public void setAnswers(Map<String, Integer> answers) { this.answers = answers; }
}
