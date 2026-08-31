package com.flashcard.srs.repository.mongo;

import com.flashcard.srs.document.WordReviewDoc;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface WordReviewMongoRepository extends MongoRepository<WordReviewDoc, Long> {

    Optional<WordReviewDoc> findByUserIdAndVocabularyId(Long userId, Long vocabularyId);

    Optional<WordReviewDoc> findFirstByUserIdAndWordKey(Long userId, String wordKey);

    List<WordReviewDoc> findByUserIdAndNextReviewBefore(Long userId, Instant time);

    long countByUserIdAndNextReviewBefore(Long userId, Instant time);

    long countByUserIdAndIntervalDaysGreaterThan(Long userId, int intervalDays);

    List<WordReviewDoc> findByUserIdAndIntervalDaysGreaterThan(Long userId, int intervalDays);

    List<WordReviewDoc> findByUserId(Long userId);

    @Query(value = "{'userId': ?0, 'lastReviewedAt': {'$gte': ?1, '$lt': ?2}, 'lastRating': {'$gte': 3}}", count = true)
    long countUniqueReviewedToday(Long userId, Instant start, Instant end);

    Page<WordReviewDoc> findByUserIdAndLastReviewedAtBetween(Long userId, Instant start, Instant end, Pageable pageable);

    Page<WordReviewDoc> findByUserIdAndLastReviewedAtBetweenAndLastRatingIn(Long userId, Instant start, Instant end, List<Integer> ratings, Pageable pageable);

    @Query(value = "{'userId': ?0, '$or': [{'nextReview': {'$lte': ?1}}, {'lastReviewedAt': {'$gte': ?2, '$lte': ?3}}]}", sort = "{'nextReview': 1}")
    List<WordReviewDoc> findMorningReviewQueue(Long userId, Instant dueThreshold, Instant yesterdayStart, Instant yesterdayEnd);

    void deleteByVocabularyIdIn(List<Long> vocabularyIds);
}
