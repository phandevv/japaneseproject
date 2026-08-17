package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.NotificationDoc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationMongoRepository extends MongoRepository<NotificationDoc, Long> {

    Page<NotificationDoc> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<NotificationDoc> findByUserIdAndIsReadFalse(Long userId);

    long countByUserIdAndIsReadFalse(Long userId);
}
