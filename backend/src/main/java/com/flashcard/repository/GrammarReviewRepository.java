package com.flashcard.repository;

import com.flashcard.model.GrammarReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GrammarReviewRepository extends JpaRepository<GrammarReview, Long> {
    Optional<GrammarReview> findByUserIdAndGrammarCardId(Long userId, Long grammarCardId);
    List<GrammarReview> findByUserId(Long userId);
    List<GrammarReview> findByUserIdAndIsLearned(Long userId, boolean isLearned);
}
