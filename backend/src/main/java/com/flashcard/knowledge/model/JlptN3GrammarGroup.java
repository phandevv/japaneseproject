package com.flashcard.knowledge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "jlpt_n3_grammar_groups", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_code"})
})
public class JlptN3GrammarGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_code", length = 100, nullable = false, unique = true)
    private String groupCode;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "LONGTEXT")
    private String description;

    @Column(name = "usage_guide", columnDefinition = "LONGTEXT")
    private String usageGuide;

    @Column(name = "usage_cases", columnDefinition = "LONGTEXT")
    private String usageCases;

    @Column(name = "grammar_pattern_ids", columnDefinition = "LONGTEXT")
    private String grammarPatternIds;

    @Column(name = "example_sentences_json", columnDefinition = "LONGTEXT")
    private String exampleSentencesJson;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "total_patterns")
    private Integer totalPatterns = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public JlptN3GrammarGroup() {
    }

    public JlptN3GrammarGroup(String groupCode, String title, String description,
                              String usageGuide, String usageCases,
                              String grammarPatternIds, String exampleSentencesJson,
                              Integer sortOrder, Integer totalPatterns) {
        this.groupCode = groupCode;
        this.title = title;
        this.description = description;
        this.usageGuide = usageGuide;
        this.usageCases = usageCases;
        this.grammarPatternIds = grammarPatternIds;
        this.exampleSentencesJson = exampleSentencesJson;
        this.sortOrder = sortOrder;
        this.totalPatterns = totalPatterns;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getGroupCode() {
        return groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getUsageGuide() {
        return usageGuide;
    }

    public void setUsageGuide(String usageGuide) {
        this.usageGuide = usageGuide;
    }

    public String getUsageCases() {
        return usageCases;
    }

    public void setUsageCases(String usageCases) {
        this.usageCases = usageCases;
    }

    public String getGrammarPatternIds() {
        return grammarPatternIds;
    }

    public void setGrammarPatternIds(String grammarPatternIds) {
        this.grammarPatternIds = grammarPatternIds;
    }

    public String getExampleSentencesJson() {
        return exampleSentencesJson;
    }

    public void setExampleSentencesJson(String exampleSentencesJson) {
        this.exampleSentencesJson = exampleSentencesJson;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Integer getTotalPatterns() {
        return totalPatterns;
    }

    public void setTotalPatterns(Integer totalPatterns) {
        this.totalPatterns = totalPatterns;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
