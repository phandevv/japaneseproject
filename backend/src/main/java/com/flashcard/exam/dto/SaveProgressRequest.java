package com.flashcard.exam.dto;

import java.util.Map;

public class SaveProgressRequest {

    private int currentSectionIndex;
    private int sectionTimeLeftSec;
    private Map<String, Integer> answers;

    public SaveProgressRequest() {}

    public int getCurrentSectionIndex() { return currentSectionIndex; }
    public void setCurrentSectionIndex(int currentSectionIndex) { this.currentSectionIndex = currentSectionIndex; }

    public int getSectionTimeLeftSec() { return sectionTimeLeftSec; }
    public void setSectionTimeLeftSec(int sectionTimeLeftSec) { this.sectionTimeLeftSec = sectionTimeLeftSec; }

    public Map<String, Integer> getAnswers() { return answers; }
    public void setAnswers(Map<String, Integer> answers) { this.answers = answers; }
}
