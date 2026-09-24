package com.flashcard.knowledge.document;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_progress")
@CompoundIndex(name = "user_chap_lesson_idx", def = "{'userId': 1, 'chapterId': 1, 'lessonId': 1}", unique = true)
public class JlptN3ProgressDoc {

    @Id
    private Long id;

    private Long userId;
    private Integer chapterId;
    private Integer lessonId;

    private Boolean vocabPassed = false;
    private Boolean kanjiPassed = false;
    private Boolean grammarPassed = false;
    private Boolean quizPassed = false;
    private Boolean readingPassed = false;
    private Integer readingScore = 0;
    private Boolean completed = false;
    private Integer bestScore = 0;

    private LocalDateTime completedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public JlptN3ProgressDoc() {
    }

    public JlptN3ProgressDoc(Long id, Long userId, Integer chapterId, Integer lessonId,
                             Boolean vocabPassed, Boolean kanjiPassed, Boolean grammarPassed,
                             Boolean quizPassed, Boolean readingPassed, Integer readingScore,
                             Boolean completed, Integer bestScore,
                             LocalDateTime completedAt, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.chapterId = chapterId;
        this.lessonId = lessonId;
        this.vocabPassed = vocabPassed != null ? vocabPassed : false;
        this.kanjiPassed = kanjiPassed != null ? kanjiPassed : false;
        this.grammarPassed = grammarPassed != null ? grammarPassed : false;
        this.quizPassed = quizPassed != null ? quizPassed : false;
        this.readingPassed = readingPassed != null ? readingPassed : false;
        this.readingScore = readingScore != null ? readingScore : 0;
        this.completed = completed != null ? completed : false;
        this.bestScore = bestScore != null ? bestScore : 0;
        this.completedAt = completedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Pure Java Builder pattern (NO Lombok)
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private Long userId;
        private Integer chapterId;
        private Integer lessonId;
        private Boolean vocabPassed = false;
        private Boolean kanjiPassed = false;
        private Boolean grammarPassed = false;
        private Boolean quizPassed = false;
        private Boolean readingPassed = false;
        private Integer readingScore = 0;
        private Boolean completed = false;
        private Integer bestScore = 0;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder userId(Long userId) { this.userId = userId; return this; }
        public Builder chapterId(Integer chapterId) { this.chapterId = chapterId; return this; }
        public Builder lessonId(Integer lessonId) { this.lessonId = lessonId; return this; }
        public Builder vocabPassed(Boolean vocabPassed) { this.vocabPassed = vocabPassed; return this; }
        public Builder kanjiPassed(Boolean kanjiPassed) { this.kanjiPassed = kanjiPassed; return this; }
        public Builder grammarPassed(Boolean grammarPassed) { this.grammarPassed = grammarPassed; return this; }
        public Builder quizPassed(Boolean quizPassed) { this.quizPassed = quizPassed; return this; }
        public Builder readingPassed(Boolean readingPassed) { this.readingPassed = readingPassed; return this; }
        public Builder readingScore(Integer readingScore) { this.readingScore = readingScore; return this; }
        public Builder completed(Boolean completed) { this.completed = completed; return this; }
        public Builder bestScore(Integer bestScore) { this.bestScore = bestScore; return this; }
        public Builder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }
        public Builder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }

        public JlptN3ProgressDoc build() {
            return new JlptN3ProgressDoc(id, userId, chapterId, lessonId, vocabPassed, kanjiPassed,
                    grammarPassed, quizPassed, readingPassed, readingScore, completed, bestScore, completedAt, createdAt, updatedAt);
        }
    }

    // Pure Getters and Setters (NO Lombok)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Integer getChapterId() { return chapterId; }
    public void setChapterId(Integer chapterId) { this.chapterId = chapterId; }

    public Integer getLessonId() { return lessonId; }
    public void setLessonId(Integer lessonId) { this.lessonId = lessonId; }

    public Boolean getVocabPassed() { return vocabPassed != null ? vocabPassed : false; }
    public void setVocabPassed(Boolean vocabPassed) { this.vocabPassed = vocabPassed; }

    public Boolean getKanjiPassed() { return kanjiPassed != null ? kanjiPassed : false; }
    public void setKanjiPassed(Boolean kanjiPassed) { this.kanjiPassed = kanjiPassed; }

    public Boolean getGrammarPassed() { return grammarPassed != null ? grammarPassed : false; }
    public void setGrammarPassed(Boolean grammarPassed) { this.grammarPassed = grammarPassed; }

    public Boolean getQuizPassed() { return quizPassed != null ? quizPassed : false; }
    public void setQuizPassed(Boolean quizPassed) { this.quizPassed = quizPassed; }

    public Boolean getReadingPassed() { return readingPassed != null ? readingPassed : false; }
    public void setReadingPassed(Boolean readingPassed) { this.readingPassed = readingPassed; }

    public Integer getReadingScore() { return readingScore != null ? readingScore : 0; }
    public void setReadingScore(Integer readingScore) { this.readingScore = readingScore; }

    public Boolean getCompleted() { return completed != null ? completed : false; }
    public void setCompleted(Boolean completed) { this.completed = completed; }

    public Integer getBestScore() { return bestScore != null ? bestScore : 0; }
    public void setBestScore(Integer bestScore) { this.bestScore = bestScore; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
