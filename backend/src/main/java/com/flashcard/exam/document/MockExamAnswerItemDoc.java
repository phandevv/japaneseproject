package com.flashcard.exam.document;

import java.time.LocalDateTime;

public class MockExamAnswerItemDoc {

    private String questionId;
    private Integer selectedAnswer;
    private Boolean isCorrect;
    private LocalDateTime answeredAt;

    public MockExamAnswerItemDoc() {
        this.answeredAt = LocalDateTime.now();
    }

    public MockExamAnswerItemDoc(String questionId, Integer selectedAnswer, Boolean isCorrect, LocalDateTime answeredAt) {
        this.questionId = questionId;
        this.selectedAnswer = selectedAnswer;
        this.isCorrect = isCorrect;
        this.answeredAt = (answeredAt != null) ? answeredAt : LocalDateTime.now();
    }

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public Integer getSelectedAnswer() {
        return selectedAnswer;
    }

    public void setSelectedAnswer(Integer selectedAnswer) {
        this.selectedAnswer = selectedAnswer;
    }

    public Boolean getIsCorrect() {
        return isCorrect;
    }

    public void setIsCorrect(Boolean isCorrect) {
        this.isCorrect = isCorrect;
    }

    public LocalDateTime getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(LocalDateTime answeredAt) {
        this.answeredAt = answeredAt;
    }
}
