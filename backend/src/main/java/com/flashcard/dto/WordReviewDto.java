package com.flashcard.dto;

import com.flashcard.model.Vocabulary;
import com.flashcard.model.WordReviewState;
import java.util.Map;

public class WordReviewDto {
    private Long id;
    private Vocabulary vocabulary;
    private WordReviewState state;
    private float difficulty;
    private float stability;
    private int intervalDays;
    private int consecutiveCorrect;
    private Map<String, Integer> projectedIntervals;

    public WordReviewDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Vocabulary getVocabulary() { return vocabulary; }
    public void setVocabulary(Vocabulary vocabulary) { this.vocabulary = vocabulary; }
    
    public WordReviewState getState() { return state; }
    public void setState(WordReviewState state) { this.state = state; }
    
    public float getDifficulty() { return difficulty; }
    public void setDifficulty(float difficulty) { this.difficulty = difficulty; }
    
    public float getStability() { return stability; }
    public void setStability(float stability) { this.stability = stability; }
    
    public int getIntervalDays() { return intervalDays; }
    public void setIntervalDays(int intervalDays) { this.intervalDays = intervalDays; }
    
    public int getConsecutiveCorrect() { return consecutiveCorrect; }
    public void setConsecutiveCorrect(int consecutiveCorrect) { this.consecutiveCorrect = consecutiveCorrect; }
    
    public Map<String, Integer> getProjectedIntervals() { return projectedIntervals; }
    public void setProjectedIntervals(Map<String, Integer> projectedIntervals) { this.projectedIntervals = projectedIntervals; }
}
