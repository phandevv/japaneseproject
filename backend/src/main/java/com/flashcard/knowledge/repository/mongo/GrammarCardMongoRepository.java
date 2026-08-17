package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.GrammarCardDoc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarCardMongoRepository extends MongoRepository<GrammarCardDoc, Long> {

    Optional<GrammarCardDoc> findByGrammar(String grammar);

    List<GrammarCardDoc> findByJlpt(String jlpt);

    Page<GrammarCardDoc> findByJlpt(String jlpt, Pageable pageable);

    List<GrammarCardDoc> findByJlptAndWeekNameAndDayName(String jlpt, String weekName, String dayName);

    @Query("{'$or': [{'grammar': {'$regex': ?0, '$options': 'i'}}, {'meaning': {'$regex': ?0, '$options': 'i'}}, {'lessonTitle': {'$regex': ?0, '$options': 'i'}}]}")
    Page<GrammarCardDoc> searchByKeywordRegex(String keyword, Pageable pageable);
}
