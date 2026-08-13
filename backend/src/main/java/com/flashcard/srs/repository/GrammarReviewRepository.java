package com.flashcard.srs.repository;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.user.model.User;
import com.flashcard.srs.model.GrammarReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarReviewRepository extends JpaRepository<GrammarReview, Long> {
    Optional<GrammarReview> findByUserIdAndGrammarCardId(Long userId, Long grammarCardId);
    
    List<GrammarReview> findByUserId(Long userId);
    
    @Query("SELECT gr FROM GrammarReview gr JOIN FETCH gr.grammarCard WHERE gr.user.id = :userId")
    List<GrammarReview> findByUserIdFetchGrammarCard(@Param("userId") Long userId);
    
    List<GrammarReview> findByUserIdAndIsLearned(Long userId, boolean isLearned);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE GrammarReview gr SET gr.nextReview = :now WHERE gr.nextReview > :now")
    int markAllReviewsAsDue(@Param("now") Instant now);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE GrammarReview gr SET gr.intervalDays = 365 WHERE gr.intervalDays > 365")
    int clampInflatedIntervals();
}

