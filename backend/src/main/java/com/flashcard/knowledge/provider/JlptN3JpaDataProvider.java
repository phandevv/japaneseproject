package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.JlptN3GrammarGroupRepository;
import com.flashcard.knowledge.repository.JlptN3GrammarQuizRepository;
import com.flashcard.knowledge.repository.JlptN3LessonQuizRepository;
import com.flashcard.knowledge.repository.JlptN3ProgressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class JlptN3JpaDataProvider implements JlptN3DataProvider {

    private final JlptN3ProgressRepository progressRepository;
    private final JlptN3GrammarQuizRepository grammarQuizRepository;
    private final JlptN3GrammarGroupRepository grammarGroupRepository;
    private final JlptN3LessonQuizRepository lessonQuizRepository;
    private final com.flashcard.knowledge.repository.JlptN3ReadingRepository readingRepository;

    @Autowired
    public JlptN3JpaDataProvider(JlptN3ProgressRepository progressRepository,
                                 JlptN3GrammarQuizRepository grammarQuizRepository,
                                 JlptN3GrammarGroupRepository grammarGroupRepository,
                                 @Autowired(required = false) JlptN3LessonQuizRepository lessonQuizRepository,
                                 @Autowired(required = false) com.flashcard.knowledge.repository.JlptN3ReadingRepository readingRepository) {
        this.progressRepository = progressRepository;
        this.grammarQuizRepository = grammarQuizRepository;
        this.grammarGroupRepository = grammarGroupRepository;
        this.lessonQuizRepository = lessonQuizRepository;
        this.readingRepository = readingRepository;
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

    @Override
    public Optional<com.flashcard.knowledge.model.JlptN3Reading> findReading(Integer chapterId, Integer lessonId) {
        return readingRepository != null ? readingRepository.findByChapterIdAndLessonId(chapterId, lessonId) : Optional.empty();
    }

    @Override
    public com.flashcard.knowledge.model.JlptN3Reading saveReading(com.flashcard.knowledge.model.JlptN3Reading reading) {
        return readingRepository != null ? readingRepository.save(reading) : reading;
    }

    @Override
    public List<JlptN3GrammarGroup> findAllGrammarGroups() {
        return grammarGroupRepository.findAllByOrderBySortOrderAsc();
    }

    @Override
    public Optional<JlptN3GrammarGroup> findGrammarGroupByCode(String groupCode) {
        return grammarGroupRepository.findByGroupCode(groupCode);
    }

    @Override
    public JlptN3GrammarGroup saveGrammarGroup(JlptN3GrammarGroup group) {
        return grammarGroupRepository.save(group);
    }

    @Override
    public void deleteAllGrammarGroups() {
        grammarGroupRepository.deleteAll();
    }

    @Override
    public List<Map<String, Object>> findQuizzesByGroupCode(String groupCode) {
        return grammarQuizRepository.findByGroupCodeOrderByCreatedAtAsc(groupCode).stream()
                .map(q -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", q.getId());
                    m.put("groupId", q.getGroupId());
                    m.put("groupCode", q.getGroupCode());
                    m.put("questionType", q.getQuestionType());
                    m.put("questionsJson", q.getQuestionsJson());
                    return m;
                })
                .collect(Collectors.toList());
    }
}
