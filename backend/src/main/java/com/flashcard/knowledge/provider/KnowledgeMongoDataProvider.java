package com.flashcard.knowledge.provider;

import com.flashcard.common.service.SequenceGeneratorService;
import com.flashcard.knowledge.document.FeedbackDoc;
import com.flashcard.knowledge.document.GrammarCardDoc;
import com.flashcard.knowledge.document.KnowledgeVersionDoc;
import com.flashcard.knowledge.model.Feedback;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.KnowledgeVersion;
import com.flashcard.knowledge.repository.mongo.FeedbackMongoRepository;
import com.flashcard.knowledge.repository.mongo.GrammarCardMongoRepository;
import com.flashcard.knowledge.repository.mongo.KnowledgeVersionMongoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mongodb")
public class KnowledgeMongoDataProvider implements KnowledgeDataProvider {

    private final GrammarCardMongoRepository grammarCardMongoRepository;
    private final FeedbackMongoRepository feedbackMongoRepository;
    private final KnowledgeVersionMongoRepository knowledgeVersionMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    public KnowledgeMongoDataProvider(GrammarCardMongoRepository grammarCardMongoRepository,
                                      FeedbackMongoRepository feedbackMongoRepository,
                                      KnowledgeVersionMongoRepository knowledgeVersionMongoRepository,
                                      SequenceGeneratorService sequenceGeneratorService) {
        this.grammarCardMongoRepository = grammarCardMongoRepository;
        this.feedbackMongoRepository = feedbackMongoRepository;
        this.knowledgeVersionMongoRepository = knowledgeVersionMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    @Override
    public Optional<GrammarCard> findGrammarById(Long id) {
        return grammarCardMongoRepository.findById(id).map(this::toGrammarCard);
    }

    @Override
    public Optional<GrammarCard> findGrammarByGrammar(String grammar) {
        return grammarCardMongoRepository.findByGrammar(grammar).map(this::toGrammarCard);
    }

    @Override
    public List<GrammarCard> findAllGrammar() {
        return grammarCardMongoRepository.findAll().stream().map(this::toGrammarCard).collect(Collectors.toList());
    }

    @Override
    public List<GrammarCard> findGrammarByJlpt(String jlpt) {
        return grammarCardMongoRepository.findByJlpt(jlpt).stream().map(this::toGrammarCard).collect(Collectors.toList());
    }

    @Override
    public Page<GrammarCard> findGrammarByJlpt(String jlpt, Pageable pageable) {
        Page<GrammarCardDoc> page = grammarCardMongoRepository.findByJlpt(jlpt, pageable);
        List<GrammarCard> list = page.getContent().stream().map(this::toGrammarCard).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, page.getTotalElements());
    }

    @Override
    public List<GrammarCard> findGrammarByJlptAndWeekAndDay(String jlpt, String weekName, String dayName) {
        return grammarCardMongoRepository.findByJlptAndWeekNameAndDayName(jlpt, weekName, dayName).stream().map(this::toGrammarCard).collect(Collectors.toList());
    }

    @Override
    public GrammarCard saveGrammar(GrammarCard gc) {
        GrammarCardDoc doc;
        if (gc.getId() == null) {
            gc.setId(sequenceGeneratorService.generateSequence("grammar_cards_seq"));
            doc = toGrammarCardDoc(gc);
        } else {
            doc = grammarCardMongoRepository.findById(gc.getId()).orElseGet(() -> toGrammarCardDoc(gc));
            updateGrammarDoc(doc, gc);
        }
        GrammarCardDoc saved = grammarCardMongoRepository.save(doc);
        return toGrammarCard(saved);
    }

    @Override
    public List<GrammarCard> saveAllGrammar(List<GrammarCard> grammarCards) {
        List<GrammarCardDoc> docs = new ArrayList<>();
        for (GrammarCard gc : grammarCards) {
            if (gc.getId() == null) {
                gc.setId(sequenceGeneratorService.generateSequence("grammar_cards_seq"));
            }
            docs.add(toGrammarCardDoc(gc));
        }
        List<GrammarCardDoc> saved = grammarCardMongoRepository.saveAll(docs);
        return saved.stream().map(this::toGrammarCard).collect(Collectors.toList());
    }

    @Override
    public long countGrammar() {
        return grammarCardMongoRepository.count();
    }

    @Override
    public Page<GrammarCard> searchGrammar(String keyword, Pageable pageable) {
        Page<GrammarCardDoc> page = grammarCardMongoRepository.searchByKeywordRegex(keyword, pageable);
        List<GrammarCard> list = page.getContent().stream().map(this::toGrammarCard).collect(Collectors.toList());
        return new PageImpl<>(list, pageable, page.getTotalElements());
    }

    @Override
    public List<String> findDistinctWeeksByJlpt(String jlpt) {
        return grammarCardMongoRepository.findByJlpt(jlpt).stream()
                .map(GrammarCardDoc::getWeekName)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> findDistinctDaysByJlptAndWeek(String jlpt, String weekName) {
        return grammarCardMongoRepository.findByJlpt(jlpt).stream()
                .filter(g -> weekName.equals(g.getWeekName()))
                .map(GrammarCardDoc::getDayName)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public Feedback saveFeedback(Feedback feedback) {
        if (feedback.getId() == null) {
            feedback.setId(sequenceGeneratorService.generateSequence("feedbacks_seq"));
        }
        FeedbackDoc doc = FeedbackDoc.builder()
                .id(feedback.getId())
                .userId(feedback.getUser() != null ? feedback.getUser().getId() : null)
                .title(feedback.getTitle())
                .content(feedback.getContent())
                .type(feedback.getType())
                .status(feedback.getStatus())
                .createdAt(feedback.getCreatedAt() != null ? feedback.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
        feedbackMongoRepository.save(doc);
        return feedback;
    }

    @Override
    public List<Feedback> findFeedbackByUser(Long userId) {
        return feedbackMongoRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toFeedback)
                .collect(Collectors.toList());
    }

    @Override
    public List<Feedback> findFeedbackByStatus(String status) {
        return feedbackMongoRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toFeedback)
                .collect(Collectors.toList());
    }

    @Override
    public KnowledgeVersion saveVersion(KnowledgeVersion kv) {
        if (kv.getId() == null) {
            kv.setId(sequenceGeneratorService.generateSequence("knowledge_versions_seq"));
        }
        KnowledgeVersionDoc doc = KnowledgeVersionDoc.builder()
                .id(kv.getId())
                .entityType(kv.getEntityType())
                .entityId(kv.getEntityId())
                .versionNumber(kv.getVersionNumber())
                .contentJson(kv.getContentJson())
                .createdBy(kv.getCreatedBy())
                .createdAt(kv.getCreatedAt() != null ? kv.getCreatedAt() : java.time.LocalDateTime.now())
                .build();
        knowledgeVersionMongoRepository.save(doc);
        return kv;
    }

    @Override
    public List<KnowledgeVersion> findVersions(String entityType, Long entityId) {
        return knowledgeVersionMongoRepository.findByEntityTypeAndEntityIdOrderByVersionNumberDesc(entityType, entityId).stream()
                .map(this::toKnowledgeVersion)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<KnowledgeVersion> findLatestVersion(String entityType, Long entityId) {
        return knowledgeVersionMongoRepository.findTopByEntityTypeAndEntityIdOrderByVersionNumberDesc(entityType, entityId)
                .map(this::toKnowledgeVersion);
    }

    // Mapping Helpers
    private GrammarCard toGrammarCard(GrammarCardDoc doc) {
        if (doc == null) return null;
        GrammarCard gc = new GrammarCard();
        gc.setId(doc.getId());
        gc.setGrammar(doc.getGrammar());
        gc.setMeaning(doc.getMeaning());
        gc.setUsageDesc(doc.getUsageDesc());
        gc.setUsageGuide(doc.getUsageGuide());
        gc.setFormation(doc.getFormation());
        gc.setJlpt(doc.getJlpt());
        gc.setSimilarGrammar(doc.getSimilarGrammar());
        gc.setDifference(doc.getDifference());
        gc.setCommonMistakes(doc.getCommonMistakes());
        gc.setExamples(doc.getExamples());
        gc.setReadingPassage(doc.getReadingPassage());
        gc.setQuizzes(doc.getQuizzes());
        gc.setWeekName(doc.getWeekName());
        gc.setDayName(doc.getDayName());
        gc.setLessonTitle(doc.getLessonTitle());
        gc.setCreatedAt(doc.getCreatedAt());
        return gc;
    }

    private GrammarCardDoc toGrammarCardDoc(GrammarCard gc) {
        return GrammarCardDoc.builder()
                .id(gc.getId())
                .grammar(gc.getGrammar())
                .meaning(gc.getMeaning())
                .usageDesc(gc.getUsageDesc())
                .usageGuide(gc.getUsageGuide())
                .formation(gc.getFormation())
                .jlpt(gc.getJlpt())
                .similarGrammar(gc.getSimilarGrammar())
                .difference(gc.getDifference())
                .commonMistakes(gc.getCommonMistakes())
                .examples(gc.getExamples())
                .readingPassage(gc.getReadingPassage())
                .quizzes(gc.getQuizzes())
                .weekName(gc.getWeekName())
                .dayName(gc.getDayName())
                .lessonTitle(gc.getLessonTitle())
                .createdAt(gc.getCreatedAt())
                .build();
    }

    private void updateGrammarDoc(GrammarCardDoc doc, GrammarCard gc) {
        doc.setGrammar(gc.getGrammar());
        doc.setMeaning(gc.getMeaning());
        doc.setUsageDesc(gc.getUsageDesc());
        doc.setUsageGuide(gc.getUsageGuide());
        doc.setFormation(gc.getFormation());
        doc.setJlpt(gc.getJlpt());
        doc.setSimilarGrammar(gc.getSimilarGrammar());
        doc.setDifference(gc.getDifference());
        doc.setCommonMistakes(gc.getCommonMistakes());
        doc.setExamples(gc.getExamples());
        doc.setReadingPassage(gc.getReadingPassage());
        doc.setQuizzes(gc.getQuizzes());
        doc.setWeekName(gc.getWeekName());
        doc.setDayName(gc.getDayName());
        doc.setLessonTitle(gc.getLessonTitle());
    }

    private Feedback toFeedback(FeedbackDoc doc) {
        if (doc == null) return null;
        Feedback f = new Feedback();
        f.setId(doc.getId());
        if (doc.getUserId() != null) {
            com.flashcard.user.model.User u = new com.flashcard.user.model.User();
            u.setId(doc.getUserId());
            f.setUser(u);
        }
        f.setTitle(doc.getTitle());
        f.setContent(doc.getContent());
        f.setType(doc.getType());
        f.setStatus(doc.getStatus());
        f.setCreatedAt(doc.getCreatedAt());
        return f;
    }

    private KnowledgeVersion toKnowledgeVersion(KnowledgeVersionDoc doc) {
        if (doc == null) return null;
        KnowledgeVersion kv = new KnowledgeVersion();
        kv.setId(doc.getId());
        kv.setEntityType(doc.getEntityType());
        kv.setEntityId(doc.getEntityId());
        kv.setVersionNumber(doc.getVersionNumber());
        kv.setContentJson(doc.getContentJson());
        kv.setCreatedBy(doc.getCreatedBy());
        kv.setCreatedAt(doc.getCreatedAt());
        return kv;
    }
}
