package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.SpeakingStatisticsDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeakingStatisticsMongoRepository extends MongoRepository<SpeakingStatisticsDoc, Long> {
    Optional<SpeakingStatisticsDoc> findByUserId(Long userId);
}
