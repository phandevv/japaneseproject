package com.flashcard.knowledge.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.document.JlptN3GrammarQuizDoc;
import com.flashcard.knowledge.document.JlptN3LessonQuizDoc;
import com.flashcard.knowledge.document.JlptN3ProgressDoc;
import com.flashcard.knowledge.model.JlptN3GrammarQuiz;
import com.flashcard.knowledge.model.JlptN3LessonQuiz;
import com.flashcard.knowledge.model.JlptN3Progress;
import com.flashcard.knowledge.repository.mongo.JlptN3GrammarQuizMongoRepository;
import com.flashcard.knowledge.repository.mongo.JlptN3LessonQuizMongoRepository;
import com.flashcard.knowledge.repository.mongo.JlptN3ProgressMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class JlptN3MongoDataProvider implements JlptN3DataProvider {

    private final JlptN3ProgressMongoRepository progressMongoRepository;
    private final JlptN3GrammarQuizMongoRepository quizMongoRepository;
    private final JlptN3LessonQuizMongoRepository lessonQuizMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public JlptN3MongoDataProvider(JlptN3ProgressMongoRepository progressMongoRepository,
                                   JlptN3GrammarQuizMongoRepository quizMongoRepository,
                                   JlptN3LessonQuizMongoRepository lessonQuizMongoRepository,
                                   SequenceGeneratorService sequenceGeneratorService) {
        this.progressMongoRepository = progressMongoRepository;
        this.quizMongoRepository = quizMongoRepository;
        this.lessonQuizMongoRepository = lessonQuizMongoRepository;
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
        p.setCompleted(doc.getCompleted());
        p.setBestScore(doc.getBestScore());
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
                .completed(p.getCompleted())
                .bestScore(p.getBestScore())
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
        doc.setCompleted(p.getCompleted());
        doc.setBestScore(p.getBestScore());
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
        return q;
    }

    private JlptN3GrammarQuizDoc toQuizDoc(JlptN3GrammarQuiz q) {
        return JlptN3GrammarQuizDoc.builder()
                .id(q.getId())
                .chapterId(q.getChapterId())
                .lessonId(q.getLessonId())
                .questionsJson(q.getQuestionsJson())
                .createdAt(q.getCreatedAt())
                .build();
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
}
