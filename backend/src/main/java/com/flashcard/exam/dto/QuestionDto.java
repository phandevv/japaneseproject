package com.flashcard.exam.dto;

import java.util.List;

/**
 * Question DTO returned to client — correctAnswer is EXCLUDED (hidden during exam).
 * correctAnswer is only included in ExamResultDto after submission.
 */
public class QuestionDto {

    private String id;
    private String section;
    private int mondai;
    private int questionNumber;
    private String questionType;
    private String questionText;
    private String passage;
    private List<String> choices;
    private String imageRef;
    private Double audioStartSec;
    private Double audioEndSec;

    // ── Constructors ───────────────────────────────────────────────────────────

    public QuestionDto() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

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

    public String getImageRef() { return imageRef; }
    public void setImageRef(String imageRef) { this.imageRef = imageRef; }

    public Double getAudioStartSec() { return audioStartSec; }
    public void setAudioStartSec(Double audioStartSec) { this.audioStartSec = audioStartSec; }

    public Double getAudioEndSec() { return audioEndSec; }
    public void setAudioEndSec(Double audioEndSec) { this.audioEndSec = audioEndSec; }
}
