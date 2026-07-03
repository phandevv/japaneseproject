package com.flashcard.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "study_sessions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "study_date"})
})
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "study_date", nullable = false)
    private LocalDate studyDate;

    @Column(name = "words_studied", nullable = false)
    private int wordsStudied = 0;

    @Column(name = "correct_answers", nullable = false)
    private int correctAnswers = 0;

    @Column(name = "total_questions", nullable = false)
    private int totalQuestions = 0;

    public StudySession() {}

    public StudySession(User user, LocalDate studyDate) {
        this.user = user;
        this.studyDate = studyDate;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getStudyDate() { return studyDate; }
    public void setStudyDate(LocalDate studyDate) { this.studyDate = studyDate; }

    public int getWordsStudied() { return wordsStudied; }
    public void setWordsStudied(int wordsStudied) { this.wordsStudied = wordsStudied; }

    public int getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(int correctAnswers) { this.correctAnswers = correctAnswers; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }
}
