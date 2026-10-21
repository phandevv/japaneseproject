package com.flashcard.exam.model;

import jakarta.persistence.*;

@Entity
@Table(name = "jlpt_exam_sections")
public class JlptExamSection {

    @Id
    @Column(name = "id", length = 100)
    private String id;

    @Column(name = "exam_id", nullable = false, length = 50)
    private String examId;

    @Column(name = "section_id", nullable = false, length = 50)
    private String sectionId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "title_vi")
    private String titleVi;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder;

    @Column(name = "time_limit_sec", nullable = false)
    private Integer timeLimitSec;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    // ── Constructors ───────────────────────────────────────────────────────────

    public JlptExamSection() {}

    public JlptExamSection(String id, String examId, String sectionId, String title, String titleVi,
                           Integer sectionOrder, Integer timeLimitSec, Integer totalQuestions) {
        this.id = id;
        this.examId = examId;
        this.sectionId = sectionId;
        this.title = title;
        this.titleVi = titleVi;
        this.sectionOrder = sectionOrder;
        this.timeLimitSec = timeLimitSec;
        this.totalQuestions = totalQuestions;
    }

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getSectionId() { return sectionId; }
    public void setSectionId(String sectionId) { this.sectionId = sectionId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTitleVi() { return titleVi; }
    public void setTitleVi(String titleVi) { this.titleVi = titleVi; }

    public Integer getSectionOrder() { return sectionOrder; }
    public void setSectionOrder(Integer sectionOrder) { this.sectionOrder = sectionOrder; }

    public Integer getTimeLimitSec() { return timeLimitSec; }
    public void setTimeLimitSec(Integer timeLimitSec) { this.timeLimitSec = timeLimitSec; }

    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }
}
