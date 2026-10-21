package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.HighFrequencyGrammar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HighFrequencyGrammarRepository extends JpaRepository<HighFrequencyGrammar, Long> {

    List<HighFrequencyGrammar> findAllByOrderByRankNumberAsc();

    List<HighFrequencyGrammar> findByLevelOrderByRankNumberAsc(String level);

    List<HighFrequencyGrammar> findByPriorityOrderByRankNumberAsc(String priority);

    Optional<HighFrequencyGrammar> findByRankNumber(Integer rankNumber);
}
