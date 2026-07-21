package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.ConversationCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationCorrectionRepository extends JpaRepository<ConversationCorrection, Long> {
    
    List<ConversationCorrection> findByConversationIdOrderByCreatedAtDesc(Long conversationId);
}

