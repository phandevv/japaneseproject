package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.KnowledgeVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KnowledgeVersionRepository extends JpaRepository<KnowledgeVersion, Long> {
    List<KnowledgeVersion> findByEntityTypeAndEntityIdOrderByVersionNumberDesc(String entityType, Long entityId);
    java.util.Optional<KnowledgeVersion> findTopByEntityTypeAndEntityIdOrderByVersionNumberDesc(String entityType, Long entityId);
}

