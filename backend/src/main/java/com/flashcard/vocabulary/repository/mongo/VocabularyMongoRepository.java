package com.flashcard.vocabulary.repository.mongo;

import com.flashcard.vocabulary.document.VocabularyDoc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VocabularyMongoRepository extends MongoRepository<VocabularyDoc, Long> {

    List<VocabularyDoc> findByLevel(String level);

    Page<VocabularyDoc> findByLevel(String level, Pageable pageable);

    List<VocabularyDoc> findByLevelAndWordType(String level, String wordType);

    Optional<VocabularyDoc> findFirstByKanji(String kanji);

    Optional<VocabularyDoc> findFirstByHiragana(String hiragana);

    Optional<VocabularyDoc> findFirstByKanjiAndCategory(String kanji, String category);

    Optional<VocabularyDoc> findFirstByHiraganaAndCategory(String hiragana, String category);

    List<VocabularyDoc> findByCategory(String category);

    @Query("{'$or': [{'kanji': {'$regex': ?0, '$options': 'i'}}, {'hiragana': {'$regex': ?0, '$options': 'i'}}, {'romaji': {'$regex': ?0, '$options': 'i'}}, {'hanViet': {'$regex': ?0, '$options': 'i'}}, {'meaning': {'$regex': ?0, '$options': 'i'}}]}")
    Page<VocabularyDoc> searchByKeywordRegex(String keyword, Pageable pageable);
}
