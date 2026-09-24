package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.JlptN3ReadingDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3ReadingMongoRepository extends MongoRepository<JlptN3ReadingDoc, Long> {
    Optional<JlptN3ReadingDoc> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
