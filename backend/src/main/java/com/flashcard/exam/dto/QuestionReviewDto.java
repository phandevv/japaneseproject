package com.flashcard.exam.dto;

import java.util.List;

public class QuestionReviewDto {

    private String questionId;
    private int mondai;
    private int questionNumber;
    private String questionType;
    private String questionText;
    private String passage;
    private List<String> choices;
    private Integer selectedChoice;
    private Integer correctAnswer;
    private Boolean isCorrect;
    private String imageRef;
    private Double audioStartSec;
    private Double audioEndSec;

    public QuestionReviewDto() {}

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }

    public int getMondai() { return mondai; }
    public void setMondai(int mondai) { this.mondai = mondai; }

    public int getQuestionNumber() { return questionNumber; }
    public void setQuestionNumber(int questionNumber) { this.questionNumber = questionNumber; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getPassage() { return passage; }
    public void setPassage(String passage) { this.passage = passage; }

    public List<String> getChoices() { return choices; }
    public void setChoices(List<String> choices) { this.choices = choices; }

    public Integer getSelectedChoice() { return selectedChoice; }
    public void setSelectedChoice(Integer selectedChoice) { this.selectedChoice = selectedChoice; }

    public Integer getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(Integer correctAnswer) { this.correctAnswer = correctAnswer; }

    public Boolean getIsCorrect() { return isCorrect; }
    public void setIsCorrect(Boolean isCorrect) { this.isCorrect = isCorrect; }

    public String getImageRef() { return imageRef; }
    public void setImageRef(String imageRef) { this.imageRef = imageRef; }

    public Double getAudioStartSec() { return audioStartSec; }
    public void setAudioStartSec(Double audioStartSec) { this.audioStartSec = audioStartSec; }

    public Double getAudioEndSec() { return audioEndSec; }
    public void setAudioEndSec(Double audioEndSec) { this.audioEndSec = audioEndSec; }
}
