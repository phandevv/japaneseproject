package com.flashcard.vocabulary.repository;

import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {

    @Query("SELECT v FROM Vocabulary v WHERE v.level = :level OR v.level LIKE CONCAT('%,', :level) OR v.level LIKE CONCAT(:level, ',%') OR v.level LIKE CONCAT('%,', :level, ',%')")
    List<Vocabulary> findByLevel(@Param("level") String level);

    java.util.Optional<Vocabulary> findFirstByKanji(String kanji);
    
    java.util.Optional<Vocabulary> findFirstByHiragana(String hiragana);

    java.util.Optional<Vocabulary> findFirstByRomaji(String romaji);
    
    java.util.Optional<Vocabulary> findByKanjiOrHiragana(String kanji, String hiragana);

    @Query("SELECT v FROM Vocabulary v WHERE v.level = :level OR v.level LIKE CONCAT('%,', :level) OR v.level LIKE CONCAT(:level, ',%') OR v.level LIKE CONCAT('%,', :level, ',%')")
    Page<Vocabulary> findByLevel(@Param("level") String level, Pageable pageable);

    @Query("SELECT v FROM Vocabulary v WHERE (v.level = :level OR v.level LIKE CONCAT('%,', :level) OR v.level LIKE CONCAT(:level, ',%') OR v.level LIKE CONCAT('%,', :level, ',%')) AND v.wordType = :wordType")
    List<Vocabulary> findByLevelAndWordType(@Param("level") String level, @Param("wordType") String wordType);

    @Query("SELECT v FROM Vocabulary v WHERE (v.level = :level OR v.level LIKE CONCAT('%,', :level) OR v.level LIKE CONCAT(:level, ',%') OR v.level LIKE CONCAT('%,', :level, ',%')) ORDER BY FUNCTION('RAND')")
    List<Vocabulary> findRandomByLevel(@Param("level") String level, Pageable pageable);

    @Query("SELECT v FROM Vocabulary v ORDER BY FUNCTION('RAND')")
    List<Vocabulary> findRandom(Pageable pageable);

    @Query("SELECT v FROM Vocabulary v WHERE " +
           "LOWER(v.kanji) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(v.hiragana) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(v.hanViet) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(v.meaning) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Vocabulary> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT v.level, COUNT(v) FROM Vocabulary v GROUP BY v.level")
    List<Object[]> countByLevel();

    @Query("SELECT DISTINCT v.wordType FROM Vocabulary v WHERE v.wordType IS NOT NULL AND v.wordType <> ''")
    List<String> findDistinctWordTypes();
}

