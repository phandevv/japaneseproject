package com.flashcard.knowledge.document;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_readings")
@CompoundIndex(name = "chap_lesson_reading_idx", def = "{'chapterId': 1, 'lessonId': 1}", unique = true)
public class JlptN3ReadingDoc {

    @Id
    private Long id;

    private Integer chapterId;
    private Integer lessonId;
    private String title;
    private String passage;
    private String translation;
    private String questionsJson;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public JlptN3ReadingDoc() {
    }

    public JlptN3ReadingDoc(Long id, Integer chapterId, Integer lessonId, String title, String passage, String translation, String questionsJson) {
        this.id = id;
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.title = title;
        this.passage = passage;
        this.translation = translation;
        this.questionsJson = questionsJson;
        this.updatedAt = LocalDateTime.now();
    }

    // Pure Getters and Setters (NO Lombok)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getChapterId() {
        return chapterId;
    }

    public void setChapterId(Integer chapterId) {
        this.chapterId = chapterId;
    }

    public Integer getLessonId() {
        return lessonId;
    }

    public void setLessonId(Integer lessonId) {
        this.lessonId = lessonId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPassage() {
        return passage;
    }

    public void setPassage(String passage) {
        this.passage = passage;
    }

    public String getTranslation() {
        return translation;
    }

    public void setTranslation(String translation) {
        this.translation = translation;
    }

    public String getQuestionsJson() {
        return questionsJson;
    }

    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
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
