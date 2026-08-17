package com.flashcard.srs.repository.mongo;

import com.flashcard.srs.document.GrammarReviewDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarReviewMongoRepository extends MongoRepository<GrammarReviewDoc, Long> {

    Optional<GrammarReviewDoc> findByUserIdAndGrammarCardId(Long userId, Long grammarCardId);

    List<GrammarReviewDoc> findByUserIdAndNextReviewBefore(Long userId, Instant time);

    long countByUserIdAndNextReviewBefore(Long userId, Instant time);

    List<GrammarReviewDoc> findByUserIdAndIsLearnedTrue(Long userId);

    long countByUserIdAndIsLearnedTrue(Long userId);

    List<GrammarReviewDoc> findByUserId(Long userId);
}
