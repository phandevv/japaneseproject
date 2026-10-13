package com.flashcard.knowledge.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.document.JlptN3GrammarGroupDoc;
import com.flashcard.knowledge.document.JlptN3GrammarQuizDoc;
import com.flashcard.knowledge.document.JlptN3LessonQuizDoc;
import com.flashcard.knowledge.document.JlptN3ProgressDoc;
import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.mongo.JlptN3GrammarQuizMongoRepository;
import com.flashcard.knowledge.repository.mongo.JlptN3GrammarGroupMongoRepository;
import com.flashcard.knowledge.repository.mongo.JlptN3LessonQuizMongoRepository;
import com.flashcard.knowledge.repository.mongo.JlptN3ProgressMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class JlptN3MongoDataProvider implements JlptN3DataProvider {

    private final JlptN3ProgressMongoRepository progressMongoRepository;
    private final JlptN3GrammarQuizMongoRepository quizMongoRepository;
    private final JlptN3GrammarGroupMongoRepository grammarGroupMongoRepository;
    private final JlptN3LessonQuizMongoRepository lessonQuizMongoRepository;
    private final com.flashcard.knowledge.repository.mongo.JlptN3ReadingMongoRepository readingMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public JlptN3MongoDataProvider(JlptN3ProgressMongoRepository progressMongoRepository,
                                   JlptN3GrammarQuizMongoRepository quizMongoRepository,
                                   JlptN3GrammarGroupMongoRepository grammarGroupMongoRepository,
                                   JlptN3LessonQuizMongoRepository lessonQuizMongoRepository,
                                   com.flashcard.knowledge.repository.mongo.JlptN3ReadingMongoRepository readingMongoRepository,
                                   SequenceGeneratorService sequenceGeneratorService) {
        this.progressMongoRepository = progressMongoRepository;
        this.quizMongoRepository = quizMongoRepository;
        this.grammarGroupMongoRepository = grammarGroupMongoRepository;
        this.lessonQuizMongoRepository = lessonQuizMongoRepository;
        this.readingMongoRepository = readingMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public Optional<JlptN3Progress> findProgress(Long userId, Integer chapterId, Integer lessonId) {
        return progressMongoRepository.findByUserIdAndChapterIdAndLessonId(userId, chapterId, lessonId)
                .map(this::toProgress);
    }

    @Override
    public List<JlptN3Progress> findProgressByUser(Long userId) {
        return progressMongoRepository.findByUserId(userId).stream().map(this::toProgress).collect(Collectors.toList());
    }

    @Override
    public List<JlptN3Progress> findProgressByUserAndChapter(Long userId, Integer chapterId) {
        return progressMongoRepository.findByUserIdAndChapterId(userId, chapterId).stream().map(this::toProgress).collect(Collectors.toList());
    }

    @Override
    public JlptN3Progress saveProgress(JlptN3Progress progress) {
        JlptN3ProgressDoc doc;
        if (progress.getId() == null) {
            progress.setId(sequenceGeneratorService.generateSequence("jlpt_n3_progress_seq"));
            doc = toProgressDoc(progress);
        } else {
            doc = progressMongoRepository.findById(progress.getId()).orElseGet(() -> toProgressDoc(progress));
            updateProgressDoc(doc, progress);
        }
        JlptN3ProgressDoc saved = progressMongoRepository.save(doc);
        return toProgress(saved);
    }

    @Override
    public Optional<JlptN3GrammarQuiz> findQuiz(Integer chapterId, Integer lessonId) {
        return quizMongoRepository.findByChapterIdAndLessonId(chapterId, lessonId)
                .map(this::toQuiz);
    }

    @Override
    public JlptN3GrammarQuiz saveQuiz(JlptN3GrammarQuiz quiz) {
        JlptN3GrammarQuizDoc doc;
        if (quiz.getId() == null) {
            quiz.setId(sequenceGeneratorService.generateSequence("jlpt_n3_quiz_seq"));
            doc = toQuizDoc(quiz);
        } else {
            doc = quizMongoRepository.findById(quiz.getId()).orElseGet(() -> toQuizDoc(quiz));
            doc.setQuestionsJson(quiz.getQuestionsJson());
            doc.setCreatedAt(quiz.getCreatedAt());
            doc.setGroupId(quiz.getGroupId());
            doc.setGroupCode(quiz.getGroupCode());
            doc.setQuestionType(quiz.getQuestionType());
        }
        JlptN3GrammarQuizDoc saved = quizMongoRepository.save(doc);
        return toQuiz(saved);
    }

    @Override
    public Optional<JlptN3LessonQuiz> findLessonQuiz(Integer chapterId, Integer lessonId) {
        return lessonQuizMongoRepository.findByChapterIdAndLessonId(chapterId, lessonId)
                .map(this::toLessonQuiz);
    }

    @Override
    public JlptN3LessonQuiz saveLessonQuiz(JlptN3LessonQuiz quiz) {
        JlptN3LessonQuizDoc doc;
        if (quiz.getId() == null) {
            quiz.setId(sequenceGeneratorService.generateSequence("jlpt_n3_lesson_quiz_seq"));
            doc = toLessonQuizDoc(quiz);
        } else {
            doc = lessonQuizMongoRepository.findById(quiz.getId()).orElseGet(() -> toLessonQuizDoc(quiz));
            doc.setChapterId(quiz.getChapterId());
            doc.setLessonId(quiz.getLessonId());
            doc.setTotalQuestions(quiz.getTotalQuestions());
            doc.setQuestionsJson(quiz.getQuestionsJson());
            doc.setUpdatedAt(quiz.getUpdatedAt());
        }
        JlptN3LessonQuizDoc saved = lessonQuizMongoRepository.save(doc);
        return toLessonQuiz(saved);
    }

    private JlptN3Progress toProgress(JlptN3ProgressDoc doc) {
        if (doc == null) return null;
        JlptN3Progress p = new JlptN3Progress();
        p.setId(doc.getId());
        p.setUserId(doc.getUserId());
        p.setChapterId(doc.getChapterId());
        p.setLessonId(doc.getLessonId());
        p.setVocabPassed(doc.getVocabPassed());
        p.setKanjiPassed(doc.getKanjiPassed());
        p.setGrammarPassed(doc.getGrammarPassed());
        p.setQuizPassed(doc.getQuizPassed());
        p.setReadingPassed(doc.getReadingPassed());
        p.setReadingScore(doc.getReadingScore());
        p.setCompleted(doc.getCompleted());
        p.setBestScore(doc.getBestScore());
        p.setGrammarReviewPassed(doc.getGrammarReviewPassed());
        p.setGrammarReviewScore(doc.getGrammarReviewScore());
        p.setGrammarReviewBestScore(doc.getGrammarReviewBestScore());
        p.setCompletedAt(doc.getCompletedAt());
        p.setCreatedAt(doc.getCreatedAt());
        p.setUpdatedAt(doc.getUpdatedAt());
        return p;
    }

    private JlptN3ProgressDoc toProgressDoc(JlptN3Progress p) {
        return JlptN3ProgressDoc.builder()
                .id(p.getId())
                .userId(p.getUserId())
                .chapterId(p.getChapterId())
                .lessonId(p.getLessonId())
                .vocabPassed(p.getVocabPassed())
                .kanjiPassed(p.getKanjiPassed())
                .grammarPassed(p.getGrammarPassed())
                .quizPassed(p.getQuizPassed())
                .readingPassed(p.getReadingPassed())
                .readingScore(p.getReadingScore())
                .completed(p.getCompleted())
                .bestScore(p.getBestScore())
                .grammarReviewPassed(p.getGrammarReviewPassed())
                .grammarReviewScore(p.getGrammarReviewScore())
                .grammarReviewBestScore(p.getGrammarReviewBestScore())
                .completedAt(p.getCompletedAt())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private void updateProgressDoc(JlptN3ProgressDoc doc, JlptN3Progress p) {
        doc.setUserId(p.getUserId());
        doc.setChapterId(p.getChapterId());
        doc.setLessonId(p.getLessonId());
        doc.setVocabPassed(p.getVocabPassed());
        doc.setKanjiPassed(p.getKanjiPassed());
        doc.setGrammarPassed(p.getGrammarPassed());
        doc.setQuizPassed(p.getQuizPassed());
        doc.setReadingPassed(p.getReadingPassed());
        doc.setReadingScore(p.getReadingScore());
        doc.setCompleted(p.getCompleted());
        doc.setBestScore(p.getBestScore());
        doc.setGrammarReviewPassed(p.getGrammarReviewPassed());
        doc.setGrammarReviewScore(p.getGrammarReviewScore());
        doc.setGrammarReviewBestScore(p.getGrammarReviewBestScore());
        doc.setCompletedAt(p.getCompletedAt());
        doc.setUpdatedAt(p.getUpdatedAt());
    }

    private JlptN3GrammarQuiz toQuiz(JlptN3GrammarQuizDoc doc) {
        if (doc == null) return null;
        JlptN3GrammarQuiz q = new JlptN3GrammarQuiz();
        q.setId(doc.getId());
        q.setChapterId(doc.getChapterId());
        q.setLessonId(doc.getLessonId());
        q.setQuestionsJson(doc.getQuestionsJson());
        q.setCreatedAt(doc.getCreatedAt());
        q.setGroupId(doc.getGroupId());
        q.setGroupCode(doc.getGroupCode());
        q.setQuestionType(doc.getQuestionType());
        return q;
    }

    private JlptN3GrammarQuizDoc toQuizDoc(JlptN3GrammarQuiz q) {
        return new JlptN3GrammarQuizDoc(
                q.getId(), q.getChapterId(), q.getLessonId(), q.getQuestionsJson(),
                q.getCreatedAt(), q.getGroupId(), q.getGroupCode(), q.getQuestionType()
        );
    }

    private JlptN3LessonQuiz toLessonQuiz(JlptN3LessonQuizDoc doc) {
        if (doc == null) return null;
        JlptN3LessonQuiz q = new JlptN3LessonQuiz();
        q.setId(doc.getId());
        q.setChapterId(doc.getChapterId());
        q.setLessonId(doc.getLessonId());
        q.setTotalQuestions(doc.getTotalQuestions());
        q.setQuestionsJson(doc.getQuestionsJson());
        q.setUpdatedAt(doc.getUpdatedAt());
        return q;
    }

    private JlptN3LessonQuizDoc toLessonQuizDoc(JlptN3LessonQuiz q) {
        return JlptN3LessonQuizDoc.builder()
                .id(q.getId())
                .chapterId(q.getChapterId())
                .lessonId(q.getLessonId())
                .totalQuestions(q.getTotalQuestions())
                .questionsJson(q.getQuestionsJson())
                .updatedAt(q.getUpdatedAt())
                .build();
    }

    @Override
    public Optional<com.flashcard.knowledge.model.JlptN3Reading> findReading(Integer chapterId, Integer lessonId) {
        return readingMongoRepository.findByChapterIdAndLessonId(chapterId, lessonId)
                .map(this::toReading);
    }

    @Override
    public com.flashcard.knowledge.model.JlptN3Reading saveReading(com.flashcard.knowledge.model.JlptN3Reading reading) {
        if (reading == null) return null;
        com.flashcard.knowledge.document.JlptN3ReadingDoc doc;
        if (reading.getId() == null) {
            Optional<com.flashcard.knowledge.document.JlptN3ReadingDoc> existing = readingMongoRepository.findByChapterIdAndLessonId(
                    reading.getChapterId(), reading.getLessonId());
            if (existing.isPresent()) {
                doc = existing.get();
                doc.setTitle(reading.getTitle());
                doc.setPassage(reading.getPassage());
                doc.setTranslation(reading.getTranslation());
                doc.setQuestionsJson(reading.getQuestionsJson());
                doc.setUpdatedAt(java.time.LocalDateTime.now());
            } else {
                doc = toReadingDoc(reading);
                doc.setId(sequenceGeneratorService.generateSequence("jlpt_n3_reading_sequence"));
                doc.setCreatedAt(java.time.LocalDateTime.now());
                doc.setUpdatedAt(java.time.LocalDateTime.now());
            }
        } else {
            doc = toReadingDoc(reading);
            doc.setUpdatedAt(java.time.LocalDateTime.now());
        }
        com.flashcard.knowledge.document.JlptN3ReadingDoc saved = readingMongoRepository.save(doc);
        return toReading(saved);
    }

    private com.flashcard.knowledge.model.JlptN3Reading toReading(com.flashcard.knowledge.document.JlptN3ReadingDoc doc) {
        if (doc == null) return null;
        com.flashcard.knowledge.model.JlptN3Reading r = new com.flashcard.knowledge.model.JlptN3Reading();
        r.setId(doc.getId());
        r.setChapterId(doc.getChapterId());
        r.setLessonId(doc.getLessonId());
        r.setTitle(doc.getTitle());
        r.setPassage(doc.getPassage());
        r.setTranslation(doc.getTranslation());
        r.setQuestionsJson(doc.getQuestionsJson());
        r.setCreatedAt(doc.getCreatedAt());
        r.setUpdatedAt(doc.getUpdatedAt());
        return r;
    }

    private com.flashcard.knowledge.document.JlptN3ReadingDoc toReadingDoc(com.flashcard.knowledge.model.JlptN3Reading r) {
        if (r == null) return null;
        com.flashcard.knowledge.document.JlptN3ReadingDoc doc = new com.flashcard.knowledge.document.JlptN3ReadingDoc();
        doc.setId(r.getId());
        doc.setChapterId(r.getChapterId());
        doc.setLessonId(r.getLessonId());
        doc.setTitle(r.getTitle());
        doc.setPassage(r.getPassage());
        doc.setTranslation(r.getTranslation());
        doc.setQuestionsJson(r.getQuestionsJson());
        doc.setCreatedAt(r.getCreatedAt());
        doc.setUpdatedAt(r.getUpdatedAt());
        return doc;
    }

    @Override
    public List<JlptN3GrammarGroup> findAllGrammarGroups() {
        return grammarGroupMongoRepository.findAll().stream()
                .map(this::toGrammarGroup)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<JlptN3GrammarGroup> findGrammarGroupByCode(String groupCode) {
        return grammarGroupMongoRepository.findByGroupCode(groupCode)
                .map(this::toGrammarGroup);
    }

    @Override
    public JlptN3GrammarGroup saveGrammarGroup(JlptN3GrammarGroup group) {
        JlptN3GrammarGroupDoc doc;
        if (group.getId() == null) {
            group.setId(sequenceGeneratorService.generateSequence("jlpt_n3_grammar_group_seq"));
            doc = toGrammarGroupDoc(group);
        } else {
            doc = grammarGroupMongoRepository.findById(group.getId()).orElseGet(() -> toGrammarGroupDoc(group));
            doc.setTitle(group.getTitle());
            doc.setDescription(group.getDescription());
            doc.setUsageGuide(group.getUsageGuide());
            doc.setUsageCases(group.getUsageCases());
            doc.setGrammarPatternIds(group.getGrammarPatternIds());
            doc.setExampleSentencesJson(group.getExampleSentencesJson());
            doc.setSortOrder(group.getSortOrder());
            doc.setTotalPatterns(group.getTotalPatterns());
        }
        JlptN3GrammarGroupDoc saved = grammarGroupMongoRepository.save(doc);
        return toGrammarGroup(saved);
    }

    @Override
    public void deleteAllGrammarGroups() {
        grammarGroupMongoRepository.deleteAll();
    }

    @Override
    public void deleteAllGroupQuizzes() {
        List<com.flashcard.knowledge.document.JlptN3GrammarQuizDoc> groupQuizzes = quizMongoRepository.findAll().stream()
                .filter(q -> q.getGroupCode() != null && !q.getGroupCode().isBlank())
                .collect(Collectors.toList());
        if (!groupQuizzes.isEmpty()) {
            quizMongoRepository.deleteAll(groupQuizzes);
        }
    }

    @Override
    public List<Map<String, Object>> findQuizzesByGroupCode(String groupCode) {
        return quizMongoRepository.findByGroupCodeOrderByCreatedAtAsc(groupCode).stream()
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

    private JlptN3GrammarGroup toGrammarGroup(JlptN3GrammarGroupDoc doc) {
        if (doc == null) return null;
        JlptN3GrammarGroup g = new JlptN3GrammarGroup();
        g.setId(doc.getId());
        g.setGroupCode(doc.getGroupCode());
        g.setTitle(doc.getTitle());
        g.setDescription(doc.getDescription());
        g.setUsageGuide(doc.getUsageGuide());
        g.setUsageCases(doc.getUsageCases());
        g.setGrammarPatternIds(doc.getGrammarPatternIds());
        g.setExampleSentencesJson(doc.getExampleSentencesJson());
        g.setSortOrder(doc.getSortOrder());
        g.setTotalPatterns(doc.getTotalPatterns());
        g.setCreatedAt(doc.getCreatedAt());
        g.setUpdatedAt(doc.getUpdatedAt());
        return g;
    }

    private JlptN3GrammarGroupDoc toGrammarGroupDoc(JlptN3GrammarGroup g) {
        JlptN3GrammarGroupDoc doc = new JlptN3GrammarGroupDoc();
        doc.setId(g.getId());
        doc.setGroupCode(g.getGroupCode());
        doc.setTitle(g.getTitle());
        doc.setDescription(g.getDescription());
        doc.setUsageGuide(g.getUsageGuide());
        doc.setUsageCases(g.getUsageCases());
        doc.setGrammarPatternIds(g.getGrammarPatternIds());
        doc.setExampleSentencesJson(g.getExampleSentencesJson());
        doc.setSortOrder(g.getSortOrder());
        doc.setTotalPatterns(g.getTotalPatterns());
        doc.setCreatedAt(g.getCreatedAt());
        doc.setUpdatedAt(g.getUpdatedAt());
        return doc;
    }
}
