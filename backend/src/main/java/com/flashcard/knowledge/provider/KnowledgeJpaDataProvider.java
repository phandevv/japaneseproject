package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Feedback;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.KnowledgeVersion;
import com.flashcard.knowledge.repository.FeedbackRepository;
import com.flashcard.knowledge.repository.GrammarCardRepository;
import com.flashcard.knowledge.repository.KnowledgeVersionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class KnowledgeJpaDataProvider implements KnowledgeDataProvider {

    private final GrammarCardRepository grammarCardRepository;
    private final FeedbackRepository feedbackRepository;
    private final KnowledgeVersionRepository knowledgeVersionRepository;

    @Autowired
    public KnowledgeJpaDataProvider(GrammarCardRepository grammarCardRepository,
                                    FeedbackRepository feedbackRepository,
                                    KnowledgeVersionRepository knowledgeVersionRepository) {
        this.grammarCardRepository = grammarCardRepository;
        this.feedbackRepository = feedbackRepository;
        this.knowledgeVersionRepository = knowledgeVersionRepository;
    }

    @Override
    public Optional<GrammarCard> findGrammarById(Long id) {
        return grammarCardRepository.findById(id);
    }

    @Override
    public Optional<GrammarCard> findGrammarByGrammar(String grammar) {
        return grammarCardRepository.findByGrammar(grammar);
    }

    @Override
    public List<GrammarCard> findAllGrammar() {
        return grammarCardRepository.findAll();
    }

    @Override
    public List<GrammarCard> findGrammarByJlpt(String jlpt) {
        return grammarCardRepository.findByJlpt(jlpt);
    }

    @Override
    public Page<GrammarCard> findGrammarByJlpt(String jlpt, Pageable pageable) {
        return grammarCardRepository.findByJlpt(jlpt, pageable);
    }

    @Override
    public List<GrammarCard> findGrammarByJlptAndWeekAndDay(String jlpt, String weekName, String dayName) {
        return grammarCardRepository.findByJlptAndWeekNameAndDayName(jlpt, weekName, dayName);
    }

    @Override
    public GrammarCard saveGrammar(GrammarCard grammarCard) {
        return grammarCardRepository.save(grammarCard);
    }

    @Override
    public List<GrammarCard> saveAllGrammar(List<GrammarCard> grammarCards) {
        return grammarCardRepository.saveAll(grammarCards);
    }

    @Override
    public long countGrammar() {
        return grammarCardRepository.count();
    }

    @Override
    public Page<GrammarCard> searchGrammar(String keyword, Pageable pageable) {
        return grammarCardRepository.searchByKeyword(keyword, pageable);
    }

    @Override
    public Page<GrammarCard> searchGrammarCards(String jlpt, String weekName, String dayName, String query, Pageable pageable) {
        return grammarCardRepository.searchGrammarCards(jlpt, weekName, dayName, query, pageable);
    }

    @Override
    public List<Map<String, Object>> getGrammarNavigation(String jlpt) {
        List<String> weeks = findDistinctWeeksByJlpt(jlpt);
        List<Map<String, Object>> navList = new java.util.ArrayList<>();
        for (String week : weeks) {
            List<String> days = findDistinctDaysByJlptAndWeek(jlpt, week);
            Map<String, Object> weekObj = new java.util.LinkedHashMap<>();
            weekObj.put("week", week);
            weekObj.put("days", days);
            navList.add(weekObj);
        }
        return navList;
    }

    @Override
    public List<String> findDistinctWeeksByJlpt(String jlpt) {
        return grammarCardRepository.findDistinctWeeksByJlpt(jlpt);
    }

    @Override
    public List<String> findDistinctDaysByJlptAndWeek(String jlpt, String weekName) {
        return grammarCardRepository.findDistinctDaysByJlptAndWeek(jlpt, weekName);
    }

    @Override
    public Feedback saveFeedback(Feedback feedback) {
        return feedbackRepository.save(feedback);
    }

    @Override
    public List<Feedback> findFeedbackByUser(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public List<Feedback> findFeedbackByStatus(String status) {
        return feedbackRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    @Override
    public KnowledgeVersion saveVersion(KnowledgeVersion version) {
        return knowledgeVersionRepository.save(version);
    }

    @Override
    public List<KnowledgeVersion> findVersions(String entityType, Long entityId) {
        return knowledgeVersionRepository.findByEntityTypeAndEntityIdOrderByVersionNumberDesc(entityType, entityId);
    }

    @Override
    public Optional<KnowledgeVersion> findLatestVersion(String entityType, Long entityId) {
        return knowledgeVersionRepository.findTopByEntityTypeAndEntityIdOrderByVersionNumberDesc(entityType, entityId);
    }
}
