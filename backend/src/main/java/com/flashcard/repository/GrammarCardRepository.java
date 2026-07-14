package com.flashcard.repository;

import com.flashcard.model.GrammarCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GrammarCardRepository extends JpaRepository<GrammarCard, Long> {
    Optional<GrammarCard> findByGrammar(String grammar);
}
