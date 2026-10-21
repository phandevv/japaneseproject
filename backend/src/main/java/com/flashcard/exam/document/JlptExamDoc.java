package com.flashcard.exam.document;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "jlpt_exams")
@CompoundIndexes({
    @CompoundIndex(name = "level_year_month_idx", def = "{'level': 1, 'examYear': -1, 'examMonth': -1}"),
    @CompoundIndex(name = "exam_year_month_idx", def = "{'examYear': -1, 'examMonth': -1}"),
    @CompoundIndex(name = "sections_questions_id_idx", def = "{'sections.questions.id': 1}")
})
public class JlptExamDoc {

    @Id
    private String id;

    @Indexed
    private String level;

    private Integer examYear;
    private Integer examMonth;
    private String title;
    private Integer totalQuestions;
    private String audioFile;
    private LocalDateTime createdAt;

    private List<ExamSectionDoc> sections;

    public JlptExamDoc() {
        this.sections = new ArrayList<>();
        this.createdAt = LocalDateTime.now();
    }

    public JlptExamDoc(String id, String level, Integer examYear, Integer examMonth,
                       String title, Integer totalQuestions, String audioFile,
                       LocalDateTime createdAt, List<ExamSectionDoc> sections) {
        this.id = id;
        this.level = level;
        this.examYear = examYear;
        this.examMonth = examMonth;
        this.title = title;
        this.totalQuestions = totalQuestions;
        this.audioFile = audioFile;
        this.createdAt = (createdAt != null) ? createdAt : LocalDateTime.now();
        this.sections = (sections != null) ? sections : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public Integer getExamYear() {
        return examYear;
    }

    public void setExamYear(Integer examYear) {
        this.examYear = examYear;
    }

    public Integer getExamMonth() {
        return examMonth;
    }

    public void setExamMonth(Integer examMonth) {
        this.examMonth = examMonth;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public String getAudioFile() {
        return audioFile;
    }

    public void setAudioFile(String audioFile) {
        this.audioFile = audioFile;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<ExamSectionDoc> getSections() {
        return sections;
    }

    public void setSections(List<ExamSectionDoc> sections) {
        this.sections = sections;
    }
}
