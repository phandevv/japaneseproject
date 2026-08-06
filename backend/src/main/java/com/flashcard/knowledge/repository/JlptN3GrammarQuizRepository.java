package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3GrammarQuizRepository extends JpaRepository<JlptN3GrammarQuiz, Long> {
    Optional<JlptN3GrammarQuiz> findByChapterIdAndLessonId(Integer chapterId, Integer lessonId);
}
