package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "jlpt_n3_progress")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "user_chap_lesson_idx", def = "{'userId': 1, 'chapterId': 1, 'lessonId': 1}", unique = true)
public class JlptN3ProgressDoc {

    @Id
    private Long id;

    private Long userId;
    private Integer chapterId;
    private Integer lessonId;

    @Builder.Default
    private Boolean vocabPassed = false;
    @Builder.Default
    private Boolean kanjiPassed = false;
    @Builder.Default
    private Boolean grammarPassed = false;
    @Builder.Default
    private Boolean quizPassed = false;
    @Builder.Default
    private Boolean completed = false;
    @Builder.Default
    private Integer bestScore = 0;

    private LocalDateTime completedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
