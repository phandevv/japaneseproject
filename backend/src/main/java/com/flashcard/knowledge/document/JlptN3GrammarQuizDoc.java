package com.flashcard.knowledge.document;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_grammar_quizzes")
public class JlptN3GrammarQuizDoc {

    @Id
    private Long id;

    private Integer chapterId;
    private Integer lessonId;
    private String questionsJson;

    @CreatedDate
    private LocalDateTime createdAt;

    private Long groupId;
    private String groupCode;
    private String questionType = "MCQ";

    public JlptN3GrammarQuizDoc() {
    }

    public JlptN3GrammarQuizDoc(Long id, Integer chapterId, Integer lessonId, String questionsJson,
                                LocalDateTime createdAt, Long groupId, String groupCode, String questionType) {
        this.id = id;
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.questionsJson = questionsJson;
        this.createdAt = createdAt;
        this.groupId = groupId;
        this.groupCode = groupCode;
        this.questionType = questionType;
    }

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

    public Long getGroupId() {
        return groupId;
    }

    public void setGroupId(Long groupId) {
        this.groupId = groupId;
    }

    public String getGroupCode() {
        return groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getQuestionType() {
        return questionType;
    }

    public void setQuestionType(String questionType) {
        this.questionType = questionType;
    }
}
