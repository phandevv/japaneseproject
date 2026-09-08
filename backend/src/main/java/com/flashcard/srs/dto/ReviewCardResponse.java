package com.flashcard.srs.dto;

import com.flashcard.srs.model.WordReviewState;

import java.time.Instant;
import java.util.Map;

public class ReviewCardResponse {
    private Long cardId;
    private Long vocabularyId;
    private String kanji;
    private String hiragana;
    private String romaji;
    private String hanViet;
    private String meaning;
    private String wordType;
    private String pitchAccent;
    private String sampleSentence;
    private String sampleReading;
    private String sampleTranslation;
    private Instant dueAt;
    private WordReviewState state;
    private float stability;
    private float difficulty;
    private int repetitions;
    private int intervalDays;
    private Map<String, Integer> projectedIntervals;

    public ReviewCardResponse() {}

    public Long getCardId() {
        return cardId;
    }

    public void setCardId(Long cardId) {
        this.cardId = cardId;
    }

    public Long getVocabularyId() {
        return vocabularyId;
    }

    public void setVocabularyId(Long vocabularyId) {
        this.vocabularyId = vocabularyId;
    }

    public String getKanji() {
        return kanji;
    }

    public void setKanji(String kanji) {
        this.kanji = kanji;
    }

    public String getHiragana() {
        return hiragana;
    }

    public void setHiragana(String hiragana) {
        this.hiragana = hiragana;
    }

    public String getRomaji() {
        return romaji;
    }

    public void setRomaji(String romaji) {
        this.romaji = romaji;
    }

    public String getHanViet() {
        return hanViet;
    }

    public void setHanViet(String hanViet) {
        this.hanViet = hanViet;
    }

    public String getMeaning() {
        return meaning;
    }

    public void setMeaning(String meaning) {
        this.meaning = meaning;
    }

    public String getWordType() {
        return wordType;
    }

    public void setWordType(String wordType) {
        this.wordType = wordType;
    }

    public String getPitchAccent() {
        return pitchAccent;
    }

    public void setPitchAccent(String pitchAccent) {
        this.pitchAccent = pitchAccent;
    }

    public String getSampleSentence() {
        return sampleSentence;
    }

    public void setSampleSentence(String sampleSentence) {
        this.sampleSentence = sampleSentence;
    }

    public String getSampleReading() {
        return sampleReading;
    }

    public void setSampleReading(String sampleReading) {
        this.sampleReading = sampleReading;
    }

    public String getSampleTranslation() {
        return sampleTranslation;
    }

    public void setSampleTranslation(String sampleTranslation) {
        this.sampleTranslation = sampleTranslation;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public WordReviewState getState() {
        return state;
    }

    public void setState(WordReviewState state) {
        this.state = state;
    }

    public float getStability() {
        return stability;
    }

    public void setStability(float stability) {
        this.stability = stability;
    }

    public float getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(float difficulty) {
        this.difficulty = difficulty;
    }

    public int getRepetitions() {
        return repetitions;
    }

    public void setRepetitions(int repetitions) {
        this.repetitions = repetitions;
    }

    public int getIntervalDays() {
        return intervalDays;
    }

    public void setIntervalDays(int intervalDays) {
        this.intervalDays = intervalDays;
    }

    public Map<String, Integer> getProjectedIntervals() {
        return projectedIntervals;
    }

    public void setProjectedIntervals(Map<String, Integer> projectedIntervals) {
        this.projectedIntervals = projectedIntervals;
    }
}
