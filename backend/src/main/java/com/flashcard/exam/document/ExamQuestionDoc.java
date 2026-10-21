package com.flashcard.exam.document;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public class ExamQuestionDoc {

    @Field("id")
    private String id;

    @Field("_id")
    private String underscoreId;

    private Integer mondaiNumber;
    private String mondaiTitle;
    private Integer questionNumber;
    private String passageText;
    private String questionText;
    private List<String> choices;
    private Integer correctAnswer;
    private String explanation;
    private Integer points;
    private Integer audioTimestampSeconds;
    private String imageUrl;

    public ExamQuestionDoc() {
    }

    public ExamQuestionDoc(String id, Integer mondaiNumber, String mondaiTitle, Integer questionNumber,
                           String passageText, String questionText, List<String> choices,
                           Integer correctAnswer, String explanation, Integer points,
                           Integer audioTimestampSeconds, String imageUrl) {
        this.id = id;
        this.underscoreId = id;
        this.mondaiNumber = mondaiNumber;
        this.mondaiTitle = mondaiTitle;
        this.questionNumber = questionNumber;
        this.passageText = passageText;
        this.questionText = questionText;
        this.choices = choices;
        this.correctAnswer = correctAnswer;
        this.explanation = explanation;
        this.points = points;
        this.audioTimestampSeconds = audioTimestampSeconds;
        this.imageUrl = imageUrl;
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

    public Integer getMondaiNumber() {
        return mondaiNumber;
    }

    public void setMondaiNumber(Integer mondaiNumber) {
        this.mondaiNumber = mondaiNumber;
    }

    public String getMondaiTitle() {
        return mondaiTitle;
    }

    public void setMondaiTitle(String mondaiTitle) {
        this.mondaiTitle = mondaiTitle;
    }

    public Integer getQuestionNumber() {
        return questionNumber;
    }

    public void setQuestionNumber(Integer questionNumber) {
        this.questionNumber = questionNumber;
    }

    public String getPassageText() {
        return passageText;
    }

    public void setPassageText(String passageText) {
        this.passageText = passageText;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public List<String> getChoices() {
        return choices;
    }

    public void setChoices(List<String> choices) {
        this.choices = choices;
    }

    public Integer getCorrectAnswer() {
        return correctAnswer;
    }

    public void setCorrectAnswer(Integer correctAnswer) {
        this.correctAnswer = correctAnswer;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Integer getAudioTimestampSeconds() {
        return audioTimestampSeconds;
    }

    public void setAudioTimestampSeconds(Integer audioTimestampSeconds) {
        this.audioTimestampSeconds = audioTimestampSeconds;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
