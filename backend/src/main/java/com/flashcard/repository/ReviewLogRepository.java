package com.flashcard.repository;

import com.flashcard.model.ReviewLog;
import com.flashcard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, Long> {

    /**
     * Find distinct vocabularies reviewed by the user within a time range (for "today-reviewed").
     */
    @Query("SELECT DISTINCT rl.wordReview.vocabulary FROM ReviewLog rl " +
           "WHERE rl.wordReview.user = :user " +
           "AND rl.createdAt >= :start AND rl.createdAt <= :end")
    List<com.flashcard.model.Vocabulary> findDistinctVocabularyByUserAndCreatedAtBetween(
            @Param("user") User user,
            @Param("start") Instant start,
            @Param("end") Instant end);
}
