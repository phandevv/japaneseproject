package com.flashcard.vocabulary.provider;

import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface VocabularyDataProvider {
    Page<Vocabulary> getAll(Pageable pageable);
    List<Vocabulary> getByLevel(String level);
    Page<Vocabulary> getByLevel(String level, Pageable pageable);
    List<Vocabulary> getByLevelAndWordType(String level, String wordType);
    List<Vocabulary> getRandomByLevel(String level, int count);
    List<Vocabulary> getRandom(int count);
    Optional<Vocabulary> getById(Long id);
    Optional<Vocabulary> findFirstByKanji(String kanji);
    Optional<Vocabulary> findFirstByHiragana(String hiragana);
    Optional<Vocabulary> findFirstByKanjiAndCategory(String kanji, String category);
    Optional<Vocabulary> findFirstByHiraganaAndCategory(String hiragana, String category);
    List<Vocabulary> findByCategory(String category);
    Vocabulary save(Vocabulary vocabulary);
    List<Vocabulary> saveAll(List<Vocabulary> vocabularies);
    void deleteById(Long id);
    void deleteAll(List<Vocabulary> vocabularies);
    Page<Vocabulary> search(String keyword, Pageable pageable);
    Map<String, Object> getStats();
    long count();
}
