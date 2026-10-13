package com.flashcard.knowledge.document;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_grammar_groups")
@CompoundIndex(name = "group_code_idx", def = "{'groupCode': 1}", unique = true)
public class JlptN3GrammarGroupDoc {

    @Id
    private Long id;

    private String groupCode;
    private String title;
    private String description;
    private String usageGuide;
    private String usageCases;
    private String grammarPatternIds;
    private String exampleSentencesJson;
    private Integer sortOrder = 0;
    private Integer totalPatterns = 0;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public JlptN3GrammarGroupDoc() {
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
