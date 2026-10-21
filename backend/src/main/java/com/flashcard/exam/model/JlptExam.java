package com.flashcard.exam.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_exams")
public class JlptExam {

    @Id
    @Column(name = "id", length = 50)
    private String id;

    @Column(name = "level", nullable = false, length = 10)
    private String level;

    @Column(name = "exam_year", nullable = false)
    private Integer year;

    @Column(name = "exam_month", nullable = false)
    private Integer month;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "audio_file")
    private String audioFile;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Constructors ───────────────────────────────────────────────────────────

    public JlptExam() {}

    public JlptExam(String id, String level, Integer year, Integer month, String title, Integer totalQuestions, String audioFile) {
        this.id = id;
        this.level = level;
        this.year = year;
        this.month = month;
        this.title = title;
        this.totalQuestions = totalQuestions;
        this.audioFile = audioFile;
        this.createdAt = LocalDateTime.now();
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }

    public String getAudioFile() { return audioFile; }
    public void setAudioFile(String audioFile) { this.audioFile = audioFile; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
