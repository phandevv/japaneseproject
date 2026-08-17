package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.KnowledgeVersionDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KnowledgeVersionMongoRepository extends MongoRepository<KnowledgeVersionDoc, Long> {

    List<KnowledgeVersionDoc> findByEntityTypeAndEntityIdOrderByVersionNumberDesc(String entityType, Long entityId);

    Optional<KnowledgeVersionDoc> findTopByEntityTypeAndEntityIdOrderByVersionNumberDesc(String entityType, Long entityId);
}
