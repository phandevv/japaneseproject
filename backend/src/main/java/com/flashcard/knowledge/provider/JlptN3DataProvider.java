package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.model.JlptN3Reading;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface JlptN3DataProvider {
    Optional<JlptN3Progress> findProgress(Long userId, Integer chapterId, Integer lessonId);
    List<JlptN3Progress> findProgressByUser(Long userId);
    List<JlptN3Progress> findProgressByUserAndChapter(Long userId, Integer chapterId);
    JlptN3Progress saveProgress(JlptN3Progress progress);

    Optional<JlptN3GrammarQuiz> findQuiz(Integer chapterId, Integer lessonId);
    JlptN3GrammarQuiz saveQuiz(JlptN3GrammarQuiz quiz);

    Optional<JlptN3LessonQuiz> findLessonQuiz(Integer chapterId, Integer lessonId);
    JlptN3LessonQuiz saveLessonQuiz(JlptN3LessonQuiz quiz);

    Optional<JlptN3Reading> findReading(Integer chapterId, Integer lessonId);
    JlptN3Reading saveReading(JlptN3Reading reading);

    List<JlptN3GrammarGroup> findAllGrammarGroups();
    Optional<JlptN3GrammarGroup> findGrammarGroupByCode(String groupCode);
    JlptN3GrammarGroup saveGrammarGroup(JlptN3GrammarGroup group);
    void deleteAllGrammarGroups();

    java.util.List<Map<String, Object>> findQuizzesByGroupCode(String groupCode);
}
