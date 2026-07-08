package com.flashcard.repository;

import com.flashcard.model.User;
import com.flashcard.model.StudySession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findByUserAndStudyDate(User user, LocalDate studyDate);

    List<StudySession> findByUserAndStudyDateBetweenOrderByStudyDateAsc(User user, LocalDate startDate, LocalDate endDate);

    @Query("SELECT s FROM StudySession s WHERE s.user = :user ORDER BY s.studyDate DESC")
    List<StudySession> findRecentSessions(@Param("user") User user);

    @Query("SELECT s.user.username as username, s.user.avatar as avatar, s.wordsStudied as wordsStudied FROM StudySession s WHERE s.studyDate = :date ORDER BY s.wordsStudied DESC")
    List<java.util.Map<String, Object>> getLeaderboardForDate(@Param("date") LocalDate date, Pageable pageable);
}
