package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.JlptN3ProgressDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JlptN3ProgressMongoRepository extends MongoRepository<JlptN3ProgressDoc, Long> {

    Optional<JlptN3ProgressDoc> findByUserIdAndChapterIdAndLessonId(Long userId, Integer chapterId, Integer lessonId);

    List<JlptN3ProgressDoc> findByUserId(Long userId);

    List<JlptN3ProgressDoc> findByUserIdAndChapterId(Long userId, Integer chapterId);
}
