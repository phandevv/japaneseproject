package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.GrammarCard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarCardRepository extends JpaRepository<GrammarCard, Long> {
    Optional<GrammarCard> findByGrammar(String grammar);

    List<GrammarCard> findByJlpt(String jlpt);
    Page<GrammarCard> findByJlpt(String jlpt, Pageable pageable);

    @Query("SELECT g FROM GrammarCard g WHERE LOWER(g.grammar) LIKE LOWER(CONCAT('%', :kw, '%')) OR LOWER(g.meaning) LIKE LOWER(CONCAT('%', :kw, '%'))")
    Page<GrammarCard> searchByKeyword(@Param("kw") String keyword, Pageable pageable);

    List<GrammarCard> findByJlptAndWeekName(String jlpt, String weekName);

    List<GrammarCard> findByJlptAndWeekNameAndDayName(String jlpt, String weekName, String dayName);

    @Query("SELECT g FROM GrammarCard g WHERE (:jlpt IS NULL OR g.jlpt = :jlpt) " +
           "AND (:weekName IS NULL OR :weekName = '' OR g.weekName = :weekName) " +
           "AND (:dayName IS NULL OR :dayName = '' OR g.dayName = :dayName) " +
           "AND (:query IS NULL OR :query = '' OR LOWER(g.grammar) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(g.meaning) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(g.usageDesc) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(g.formation) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<GrammarCard> searchGrammarCards(
            @Param("jlpt") String jlpt,
            @Param("weekName") String weekName,
            @Param("dayName") String dayName,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("SELECT DISTINCT g.weekName FROM GrammarCard g WHERE g.jlpt = :jlpt AND g.weekName IS NOT NULL ORDER BY g.weekName")
    List<String> findDistinctWeeksByJlpt(@Param("jlpt") String jlpt);

    @Query("SELECT DISTINCT g.dayName FROM GrammarCard g WHERE g.jlpt = :jlpt AND g.weekName = :weekName AND g.dayName IS NOT NULL ORDER BY g.dayName")
    List<String> findDistinctDaysByJlptAndWeek(@Param("jlpt") String jlpt, @Param("weekName") String weekName);
}
