package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.JlptN3LessonQuizDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface JlptN3LessonQuizMongoRepository extends MongoRepository<JlptN3LessonQuizDoc, Long> {
    Optional<JlptN3LessonQuizDoc> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
