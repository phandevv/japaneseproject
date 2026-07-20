package com.flashcard.repository;

import com.flashcard.model.DailyStudyStats;
import com.flashcard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyStudyStatsRepository extends JpaRepository<DailyStudyStats, Long> {
    Optional<DailyStudyStats> findByUserAndDate(User user, LocalDate date);
}
