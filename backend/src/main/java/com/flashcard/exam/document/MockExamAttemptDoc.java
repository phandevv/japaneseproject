package com.flashcard.exam.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "mock_exam_attempts")
@CompoundIndexes({
    @CompoundIndex(name = "user_started_idx", def = "{'userId': 1, 'startedAt': -1}"),
    @CompoundIndex(name = "user_exam_started_idx", def = "{'userId': 1, 'examId': 1, 'startedAt': -1}"),
    @CompoundIndex(name = "user_exam_status_idx", def = "{'userId': 1, 'examId': 1, 'status': 1, 'startedAt': -1}"),
    @CompoundIndex(name = "user_attempt_id_idx", def = "{'userId': 1, '_id': 1}"),
    @CompoundIndex(name = "user_completed_idx", def = "{'userId': 1, 'completedAt': -1}")
})
public class MockExamAttemptDoc {

    @Id
    private Long id;

    @Indexed
    private Long userId;

    @Indexed
    private String examId;

    private String examTitle;
    private String status; // IN_PROGRESS, SUBMITTED, TIMED_OUT
    private Integer totalCorrect = 0;
    private Integer totalQuestions = 0;
    private Integer score;
    private Integer totalPoints;
    private Double percentage;
    private Boolean passed;

    private Integer vocabScore;
    private Integer vocabTotal;
    private Integer readingScore;
    private Integer readingTotal;
    private Integer listeningScore;
    private Integer listeningTotal;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    private List<MockExamAnswerItemDoc> answers;

    public MockExamAttemptDoc() {
        this.answers = new ArrayList<>();
        this.startedAt = LocalDateTime.now();
    }

    public MockExamAttemptDoc(Long id, Long userId, String examId, String examTitle, String status,
                              Integer score, Integer totalPoints, Double percentage, Boolean passed,
                              Integer vocabScore, Integer vocabTotal, Integer readingScore, Integer readingTotal,
                              Integer listeningScore, Integer listeningTotal, LocalDateTime startedAt,
                              LocalDateTime submittedAt, List<MockExamAnswerItemDoc> answers) {
        this.id = id;
        this.userId = userId;
        this.examId = examId;
        this.examTitle = examTitle;
        this.status = status;
        this.score = score;
        this.totalPoints = totalPoints;
        this.percentage = percentage;
        this.passed = passed;
        this.vocabScore = vocabScore;
        this.vocabTotal = vocabTotal;
        this.readingScore = readingScore;
        this.readingTotal = readingTotal;
        this.listeningScore = listeningScore;
        this.listeningTotal = listeningTotal;
        this.startedAt = (startedAt != null) ? startedAt : LocalDateTime.now();
        this.submittedAt = submittedAt;
        this.answers = (answers != null) ? answers : new ArrayList<>();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getExamId() {
        return examId;
    }

    public void setExamId(String examId) {
        this.examId = examId;
    }

    public String getExamTitle() {
        return examTitle;
    }

    public void setExamTitle(String examTitle) {
        this.examTitle = examTitle;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getTotalCorrect() {
        return totalCorrect;
    }

    public void setTotalCorrect(Integer totalCorrect) {
        this.totalCorrect = totalCorrect;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getTotalPoints() {
        return totalPoints;
    }

    public void setTotalPoints(Integer totalPoints) {
        this.totalPoints = totalPoints;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }

    public Boolean getPassed() {
        return passed;
    }

    public void setPassed(Boolean passed) {
        this.passed = passed;
    }

    public Integer getVocabScore() {
        return vocabScore;
    }

    public void setVocabScore(Integer vocabScore) {
        this.vocabScore = vocabScore;
    }

    public Integer getVocabTotal() {
        return vocabTotal;
    }

    public void setVocabTotal(Integer vocabTotal) {
        this.vocabTotal = vocabTotal;
    }

    public Integer getReadingScore() {
        return readingScore;
    }

    public void setReadingScore(Integer readingScore) {
        this.readingScore = readingScore;
    }

    public Integer getReadingTotal() {
        return readingTotal;
    }

    public void setReadingTotal(Integer readingTotal) {
        this.readingTotal = readingTotal;
    }

    public Integer getListeningScore() {
        return listeningScore;
    }

    public void setListeningScore(Integer listeningScore) {
        this.listeningScore = listeningScore;
    }

    public Integer getListeningTotal() {
        return listeningTotal;
    }

    public void setListeningTotal(Integer listeningTotal) {
        this.listeningTotal = listeningTotal;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public List<MockExamAnswerItemDoc> getAnswers() {
        return answers;
    }

    public void setAnswers(List<MockExamAnswerItemDoc> answers) {
        this.answers = answers;
    }
}
