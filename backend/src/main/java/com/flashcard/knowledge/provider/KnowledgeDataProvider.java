package com.flashcard.knowledge.provider;

import com.flashcard.knowledge.model.Feedback;
import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.knowledge.model.KnowledgeVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface KnowledgeDataProvider {
    Optional<GrammarCard> findGrammarById(Long id);
    Optional<GrammarCard> findGrammarByGrammar(String grammar);
    List<GrammarCard> findAllGrammar();
    List<GrammarCard> findGrammarByJlpt(String jlpt);
    Page<GrammarCard> findGrammarByJlpt(String jlpt, Pageable pageable);
    List<GrammarCard> findGrammarByJlptAndWeekAndDay(String jlpt, String weekName, String dayName);
    GrammarCard saveGrammar(GrammarCard grammarCard);
    List<GrammarCard> saveAllGrammar(List<GrammarCard> grammarCards);
    long countGrammar();
    Page<GrammarCard> searchGrammar(String keyword, Pageable pageable);
    Page<GrammarCard> searchGrammarCards(String jlpt, String weekName, String dayName, String query, Pageable pageable);
    List<Map<String, Object>> getGrammarNavigation(String jlpt);
    List<String> findDistinctWeeksByJlpt(String jlpt);
    List<String> findDistinctDaysByJlptAndWeek(String jlpt, String weekName);

    Feedback saveFeedback(Feedback feedback);
    List<Feedback> findFeedbackByUser(Long userId);
    List<Feedback> findFeedbackByStatus(String status);

    KnowledgeVersion saveVersion(KnowledgeVersion version);
    List<KnowledgeVersion> findVersions(String entityType, Long entityId);
    Optional<KnowledgeVersion> findLatestVersion(String entityType, Long entityId);
}
