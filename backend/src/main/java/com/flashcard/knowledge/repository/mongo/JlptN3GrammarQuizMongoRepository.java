package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.JlptN3GrammarQuizDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3GrammarQuizMongoRepository extends MongoRepository<JlptN3GrammarQuizDoc, Long> {
    Optional<JlptN3GrammarQuizDoc> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
