package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.JlptN3Reading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3ReadingRepository extends JpaRepository<JlptN3Reading, Long> {
    Optional<JlptN3Reading> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
