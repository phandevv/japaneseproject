package com.flashcard.knowledge.dto;

import com.flashcard.knowledge.document.HighFrequencyGrammarDoc;
import com.flashcard.knowledge.model.HighFrequencyGrammar;
import com.flashcard.knowledge.model.HighFrequencyGrammarReview;

import java.time.Instant;

public class HighFrequencyGrammarDto {

    private Long id;
    private Integer rankNumber;
    private String grammar;
    private String level;
    private Integer totalOccurrences;
    private String examCoverage;
    private Double avgPerExam;
    private Integer bunpouCount;
    private Integer dokkaiCount;
    private Integer choukaiCount;
    private Integer goiCount;
    private String priority;
    private String priorityStars;
    private String formation;
    private String meaning;
    private String examExamplesJson;
    private String recentTrend;
    private String studyTip;

    // SRS fields
    private Boolean isReviewed = false;
    private Boolean isLearned = false;
    private Double easeFactor;
    private Integer intervalDays;
    private Integer repetitions;
    private Instant nextReview;
    private Integer lastQuality;

    public HighFrequencyGrammarDto() {}

    public HighFrequencyGrammarDto(HighFrequencyGrammar entity) {
        if (entity != null) {
            this.id = entity.getId();
            this.rankNumber = entity.getRankNumber();
            this.grammar = entity.getGrammar();
            this.level = entity.getLevel();
            this.totalOccurrences = entity.getTotalOccurrences();
            this.examCoverage = entity.getExamCoverage();
            this.avgPerExam = entity.getAvgPerExam();
            this.bunpouCount = entity.getBunpouCount();
            this.dokkaiCount = entity.getDokkaiCount();
            this.choukaiCount = entity.getChoukaiCount();
            this.goiCount = entity.getGoiCount();
            this.priority = entity.getPriority();
            this.priorityStars = entity.getPriorityStars();
            this.formation = entity.getFormation();
            this.meaning = entity.getMeaning();
            this.examExamplesJson = entity.getExamExamplesJson();
            this.recentTrend = entity.getRecentTrend();
            this.studyTip = entity.getStudyTip();
        }
    }

    public HighFrequencyGrammarDto(HighFrequencyGrammarDoc doc) {
        if (doc != null) {
            this.id = doc.getId();
            this.rankNumber = doc.getRankNumber();
            this.grammar = doc.getGrammar();
            this.level = doc.getLevel();
            this.totalOccurrences = doc.getTotalOccurrences();
            this.examCoverage = doc.getExamCoverage();
            this.avgPerExam = doc.getAvgPerExam();
            this.bunpouCount = doc.getBunpouCount();
            this.dokkaiCount = doc.getDokkaiCount();
            this.choukaiCount = doc.getChoukaiCount();
            this.goiCount = doc.getGoiCount();
            this.priority = doc.getPriority();
            this.priorityStars = doc.getPriorityStars();
            this.formation = doc.getFormation();
            this.meaning = doc.getMeaning();
            this.examExamplesJson = doc.getExamExamplesJson();
            this.recentTrend = doc.getRecentTrend();
            this.studyTip = doc.getStudyTip();
        }
    }

    public void applyReview(HighFrequencyGrammarReview review) {
        if (review != null) {
            this.isReviewed = true;
            this.isLearned = review.isLearned();
            this.easeFactor = review.getEaseFactor();
            this.intervalDays = review.getIntervalDays();
            this.repetitions = review.getRepetitions();
            this.nextReview = review.getNextReview();
            this.lastQuality = review.getLastQuality();
        }
    }

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

    public Boolean getIsReviewed() { return isReviewed; }
    public void setIsReviewed(Boolean isReviewed) { this.isReviewed = isReviewed; }

    public Boolean getIsLearned() { return isLearned; }
    public void setIsLearned(Boolean isLearned) { this.isLearned = isLearned; }

    public Double getEaseFactor() { return easeFactor; }
    public void setEaseFactor(Double easeFactor) { this.easeFactor = easeFactor; }

    public Integer getIntervalDays() { return intervalDays; }
    public void setIntervalDays(Integer intervalDays) { this.intervalDays = intervalDays; }

    public Integer getRepetitions() { return repetitions; }
    public void setRepetitions(Integer repetitions) { this.repetitions = repetitions; }

    public Instant getNextReview() { return nextReview; }
    public void setNextReview(Instant nextReview) { this.nextReview = nextReview; }

    public Integer getLastQuality() { return lastQuality; }
    public void setLastQuality(Integer lastQuality) { this.lastQuality = lastQuality; }
}
