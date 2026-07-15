package com.flashcard.repository;

import com.flashcard.model.ConversationCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationCorrectionRepository extends JpaRepository<ConversationCorrection, Long> {
    
    List<ConversationCorrection> findByConversationIdOrderByCreatedAtDesc(Long conversationId);
}
