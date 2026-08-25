package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.JlptN3GrammarQuizRepository;
import com.flashcard.knowledge.repository.JlptN3LessonQuizRepository;
import com.flashcard.knowledge.repository.JlptN3ProgressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class JlptN3JpaDataProvider implements JlptN3DataProvider {

    private final JlptN3ProgressRepository progressRepository;
    private final JlptN3GrammarQuizRepository grammarQuizRepository;
    private final JlptN3LessonQuizRepository lessonQuizRepository;

    @Autowired
    public JlptN3JpaDataProvider(JlptN3ProgressRepository progressRepository,
                                 JlptN3GrammarQuizRepository grammarQuizRepository,
                                 @Autowired(required = false) JlptN3LessonQuizRepository lessonQuizRepository) {
        this.progressRepository = progressRepository;
        this.grammarQuizRepository = grammarQuizRepository;
        this.lessonQuizRepository = lessonQuizRepository;
    }

    @Override
    public Optional<JlptN3Progress> findProgress(Long userId, Integer chapterId, Integer lessonId) {
        return progressRepository.findByUserIdAndChapterIdAndLessonId(userId, chapterId, lessonId);
    }

    @Override
    public List<JlptN3Progress> findProgressByUser(Long userId) {
        return progressRepository.findByUserId(userId);
    }

    @Override
    public List<JlptN3Progress> findProgressByUserAndChapter(Long userId, Integer chapterId) {
        return progressRepository.findByUserIdAndChapterId(userId, chapterId);
    }

    @Override
    public JlptN3Progress saveProgress(JlptN3Progress progress) {
        return progressRepository.save(progress);
    }

    @Override
    public Optional<JlptN3GrammarQuiz> findQuiz(Integer chapterId, Integer lessonId) {
        return grammarQuizRepository.findByChapterIdAndLessonId(chapterId, lessonId);
    }

    @Override
    public JlptN3GrammarQuiz saveQuiz(JlptN3GrammarQuiz quiz) {
        return grammarQuizRepository.save(quiz);
    }

    @Override
    public Optional<JlptN3LessonQuiz> findLessonQuiz(Integer chapterId, Integer lessonId) {
        return lessonQuizRepository != null ? lessonQuizRepository.findByChapterIdAndLessonId(chapterId, lessonId) : Optional.empty();
    }

    @Override
    public JlptN3LessonQuiz saveLessonQuiz(JlptN3LessonQuiz quiz) {
        return lessonQuizRepository != null ? lessonQuizRepository.save(quiz) : quiz;
    }
}
