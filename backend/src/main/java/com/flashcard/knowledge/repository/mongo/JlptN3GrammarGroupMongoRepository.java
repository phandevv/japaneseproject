package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.JlptN3GrammarGroupDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JlptN3GrammarGroupMongoRepository extends MongoRepository<JlptN3GrammarGroupDoc, Long> {
    Optional<JlptN3GrammarGroupDoc> findByGroupCode(String groupCode);
    void deleteAll();
}
