package com.flashcard.repository;

import com.flashcard.model.ReviewRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReviewRecommendationRepository extends JpaRepository<ReviewRecommendation, Long> {
    
    Optional<ReviewRecommendation> findByConversationId(Long conversationId);
}
