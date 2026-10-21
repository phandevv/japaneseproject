package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.HighFrequencyGrammarReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface HighFrequencyGrammarReviewRepository extends JpaRepository<HighFrequencyGrammarReview, Long> {

    Optional<HighFrequencyGrammarReview> findByUserIdAndGrammarId(Long userId, Long grammarId);

    List<HighFrequencyGrammarReview> findByUserId(Long userId);

    @Query("SELECT r FROM HighFrequencyGrammarReview r JOIN FETCH r.grammar WHERE r.user.id = :userId AND r.nextReview <= :now ORDER BY r.nextReview ASC")
    List<HighFrequencyGrammarReview> findDueReviews(@Param("userId") Long userId, @Param("now") Instant now);

    @Query("SELECT COUNT(r) FROM HighFrequencyGrammarReview r WHERE r.user.id = :userId AND r.isLearned = true")
    long countLearnedByUserId(@Param("userId") Long userId);
}
