package com.flashcard.knowledge.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_high_frequency_grammar")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class HighFrequencyGrammar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rank_number", nullable = false)
    private Integer rankNumber;

    @Column(name = "grammar", nullable = false)
    private String grammar;

    @Column(name = "level", nullable = false)
    private String level;

    @Column(name = "total_occurrences", nullable = false)
    private Integer totalOccurrences = 0;

    @Column(name = "exam_coverage", nullable = false)
    private String examCoverage;

    @Column(name = "avg_per_exam", nullable = false)
    private Double avgPerExam = 0.0;

    @Column(name = "bunpou_count", nullable = false)
    private Integer bunpouCount = 0;

    @Column(name = "dokkai_count", nullable = false)
    private Integer dokkaiCount = 0;

    @Column(name = "choukai_count", nullable = false)
    private Integer choukaiCount = 0;

    @Column(name = "goi_count", nullable = false)
    private Integer goiCount = 0;

    @Column(name = "priority", nullable = false)
    private String priority;

    @Column(name = "priority_stars")
    private String priorityStars;

    @Column(name = "formation", columnDefinition = "TEXT")
    private String formation;

    @Column(name = "meaning", columnDefinition = "TEXT", nullable = false)
    private String meaning;

    @Column(name = "exam_examples_json", columnDefinition = "TEXT")
    private String examExamplesJson;

    @Column(name = "recent_trend")
    private String recentTrend;

    @Column(name = "study_tip", columnDefinition = "TEXT")
    private String studyTip;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public HighFrequencyGrammar() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getRankNumber() { return rankNumber; }
    public void setRankNumber(Integer rankNumber) { this.rankNumber = rankNumber; }

    public String getGrammar() { return grammar; }
    public void setGrammar(String grammar) { this.grammar = grammar; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public Integer getTotalOccurrences() { return totalOccurrences; }
    public void setTotalOccurrences(Integer totalOccurrences) { this.totalOccurrences = totalOccurrences; }

    public String getExamCoverage() { return examCoverage; }
    public void setExamCoverage(String examCoverage) { this.examCoverage = examCoverage; }

    public Double getAvgPerExam() { return avgPerExam; }
    public void setAvgPerExam(Double avgPerExam) { this.avgPerExam = avgPerExam; }

    public Integer getBunpouCount() { return bunpouCount; }
    public void setBunpouCount(Integer bunpouCount) { this.bunpouCount = bunpouCount; }

    public Integer getDokkaiCount() { return dokkaiCount; }
    public void setDokkaiCount(Integer dokkaiCount) { this.dokkaiCount = dokkaiCount; }

    public Integer getChoukaiCount() { return choukaiCount; }
    public void setChoukaiCount(Integer choukaiCount) { this.choukaiCount = choukaiCount; }

    public Integer getGoiCount() { return goiCount; }
    public void setGoiCount(Integer goiCount) { this.goiCount = goiCount; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getPriorityStars() { return priorityStars; }
    public void setPriorityStars(String priorityStars) { this.priorityStars = priorityStars; }

    public String getFormation() { return formation; }
    public void setFormation(String formation) { this.formation = formation; }

    public String getMeaning() { return meaning; }
    public void setMeaning(String meaning) { this.meaning = meaning; }

    public String getExamExamplesJson() { return examExamplesJson; }
    public void setExamExamplesJson(String examExamplesJson) { this.examExamplesJson = examExamplesJson; }

    public String getRecentTrend() { return recentTrend; }
    public void setRecentTrend(String recentTrend) { this.recentTrend = recentTrend; }

    public String getStudyTip() { return studyTip; }
    public void setStudyTip(String studyTip) { this.studyTip = studyTip; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
