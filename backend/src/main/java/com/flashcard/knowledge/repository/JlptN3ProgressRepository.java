package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.JlptN3Progress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JlptN3ProgressRepository extends JpaRepository<JlptN3Progress, Long> {

    List<JlptN3Progress> findByUserId(Long userId);

    Optional<JlptN3Progress> findByUserIdAndChapterIdAndLessonId(Long userId, Integer chapterId, Integer lessonId);
}
