package com.flashcard.repository;

import com.flashcard.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    List<Conversation> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT c FROM Conversation c WHERE c.user.id = :userId AND c.status = 'ACTIVE'")
    Optional<Conversation> findActiveConversationByUserId(@Param("userId") Long userId);
}
