package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.GrammarCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GrammarCardRepository extends JpaRepository<GrammarCard, Long> {
    Optional<GrammarCard> findByGrammar(String grammar);
}

