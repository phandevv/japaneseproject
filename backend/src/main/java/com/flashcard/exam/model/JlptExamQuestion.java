package com.flashcard.exam.model;

import jakarta.persistence.*;

@Entity
@Table(name = "jlpt_exam_questions")
public class JlptExamQuestion {

    @Id
    @Column(name = "id", length = 100)
    private String id;

    @Column(name = "exam_id", nullable = false, length = 50)
    private String examId;

    @Column(name = "section_id", nullable = false, length = 50)
    private String sectionId;

    @Column(name = "section_record_id", nullable = false, length = 100)
    private String sectionRecordId;

    @Column(name = "mondai", nullable = false)
    private Integer mondai;

    @Column(name = "question_number", nullable = false)
    private Integer questionNumber;

    @Column(name = "question_type", length = 50)
    private String questionType;

    @Column(name = "question_text", columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "passage", columnDefinition = "TEXT")
    private String passage;

    @Column(name = "choices_json", nullable = false, columnDefinition = "TEXT")
    private String choicesJson;

    @Column(name = "correct_answer", nullable = false)
    private Integer correctAnswer;

    @Column(name = "image_ref")
    private String imageRef;

    @Column(name = "audio_start_sec")
    private Double audioStartSec;

    @Column(name = "audio_end_sec")
    private Double audioEndSec;

    @Column(name = "question_order", nullable = false)
    private Integer questionOrder;

    // ── Constructors ───────────────────────────────────────────────────────────

    public JlptExamQuestion() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getSectionRecordId() { return sectionRecordId; }
    public void setSectionRecordId(String sectionRecordId) { this.sectionRecordId = sectionRecordId; }

    public Integer getMondai() { return mondai; }
    public void setMondai(Integer mondai) { this.mondai = mondai; }

    public Integer getQuestionNumber() { return questionNumber; }
    public void setQuestionNumber(Integer questionNumber) { this.questionNumber = questionNumber; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public String getPassage() { return passage; }
    public void setPassage(String passage) { this.passage = passage; }

    public String getChoicesJson() { return choicesJson; }
    public void setChoicesJson(String choicesJson) { this.choicesJson = choicesJson; }

    public Integer getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(Integer correctAnswer) { this.correctAnswer = correctAnswer; }

    public String getImageRef() { return imageRef; }
    public void setImageRef(String imageRef) { this.imageRef = imageRef; }

    public Double getAudioStartSec() { return audioStartSec; }
    public void setAudioStartSec(Double audioStartSec) { this.audioStartSec = audioStartSec; }

    public Double getAudioEndSec() { return audioEndSec; }
    public void setAudioEndSec(Double audioEndSec) { this.audioEndSec = audioEndSec; }

    public Integer getQuestionOrder() { return questionOrder; }
    public void setQuestionOrder(Integer questionOrder) { this.questionOrder = questionOrder; }
}
