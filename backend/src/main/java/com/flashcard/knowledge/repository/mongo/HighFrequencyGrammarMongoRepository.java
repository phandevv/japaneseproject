package com.flashcard.knowledge.repository.mongo;

import com.flashcard.knowledge.document.HighFrequencyGrammarDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HighFrequencyGrammarMongoRepository extends MongoRepository<HighFrequencyGrammarDoc, Long> {

    List<HighFrequencyGrammarDoc> findAllByOrderByRankNumberAsc();

    Optional<HighFrequencyGrammarDoc> findByGrammar(String grammar);

    Optional<HighFrequencyGrammarDoc> findByRankNumber(Integer rankNumber);

    List<HighFrequencyGrammarDoc> findByLevelOrderByRankNumberAsc(String level);

    List<HighFrequencyGrammarDoc> findByPriorityOrderByRankNumberAsc(String priority);
}
