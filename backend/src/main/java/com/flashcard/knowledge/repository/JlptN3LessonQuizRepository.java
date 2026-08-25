package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3LessonQuizRepository extends JpaRepository<JlptN3LessonQuiz, Long> {
    Optional<JlptN3LessonQuiz> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
