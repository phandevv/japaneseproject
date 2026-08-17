package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.FeedbackDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackMongoRepository extends MongoRepository<FeedbackDoc, Long> {
    List<FeedbackDoc> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<FeedbackDoc> findByStatusOrderByCreatedAtDesc(String status);
}
