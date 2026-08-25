package com.flashcard.knowledge.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "jlpt_n3_lesson_quizzes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@CompoundIndex(name = "chap_lesson_quiz_idx", def = "{'chapterId': 1, 'lessonId': 1}", unique = true)
public class JlptN3LessonQuizDoc {

    @Id
    private Long id;

    private Integer chapterId;
    private Integer lessonId;
    private Integer totalQuestions;

    private List<Map<String, Object>> questions;
    private String questionsJson;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
