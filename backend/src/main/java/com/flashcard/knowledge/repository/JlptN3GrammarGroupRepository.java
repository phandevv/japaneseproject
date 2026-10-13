package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.JlptN3GrammarGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JlptN3GrammarGroupRepository extends JpaRepository<JlptN3GrammarGroup, Long> {
    List<JlptN3GrammarGroup> findAllByOrderBySortOrderAsc();
    Optional<JlptN3GrammarGroup> findByGroupCode(String groupCode);
}
