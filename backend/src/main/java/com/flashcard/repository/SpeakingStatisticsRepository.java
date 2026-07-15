package com.flashcard.repository;

import com.flashcard.model.SpeakingStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpeakingStatisticsRepository extends JpaRepository<SpeakingStatistics, Long> {
    
    Optional<SpeakingStatistics> findByUserId(Long userId);
}
