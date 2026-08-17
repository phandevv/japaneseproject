package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.ConversationDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationMongoRepository extends MongoRepository<ConversationDoc, Long> {

    List<ConversationDoc> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<ConversationDoc> findByIdAndUserId(Long id, Long userId);
}
