package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;

import java.util.List;
import java.util.Optional;

public interface JlptN3DataProvider {
    Optional<JlptN3Progress> findProgress(Long userId, Integer chapterId, Integer lessonId);
    List<JlptN3Progress> findProgressByUser(Long userId);
    List<JlptN3Progress> findProgressByUserAndChapter(Long userId, Integer chapterId);
    JlptN3Progress saveProgress(JlptN3Progress progress);

    Optional<JlptN3GrammarQuiz> findQuiz(Integer chapterId, Integer lessonId);
    JlptN3GrammarQuiz saveQuiz(JlptN3GrammarQuiz quiz);
}
