package com.flashcard.knowledge.document;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_high_frequency_grammar")
@CompoundIndex(name = "rank_number_idx", def = "{'rankNumber': 1}", unique = true)
public class HighFrequencyGrammarDoc {

    @Id
    private Long id;

    @Indexed(unique = true)
    private Integer rankNumber;

    @Indexed
    private String grammar;

    private String level;
    private Integer totalOccurrences = 0;
    private String examCoverage;
    private Double avgPerExam = 0.0;
    private Integer bunpouCount = 0;
    private Integer dokkaiCount = 0;
    private Integer choukaiCount = 0;
    private Integer goiCount = 0;
    private String priority;
    private String priorityStars;
    private String formation;
    private String meaning;
    private String examExamplesJson;
    private String recentTrend;
    private String studyTip;

    @CreatedDate
    private LocalDateTime createdAt;

    public HighFrequencyGrammarDoc() {}

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
