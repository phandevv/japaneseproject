package com.flashcard.knowledge.repository;

import com.flashcard.knowledge.model.SpeakingStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeakingStatisticsRepository extends JpaRepository<SpeakingStatistics, Long> {
    
    Optional<SpeakingStatistics> findByUserId(Long userId);
}

