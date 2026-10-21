package com.flashcard.exam.repository;

import com.flashcard.exam.model.MockExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamAttemptRepository extends JpaRepository<MockExamAttempt, Long> {

    List<MockExamAttempt> findByUserIdOrderByStartedAtDesc(Long userId);

    @Query("SELECT a FROM MockExamAttempt a WHERE a.userId = :userId AND a.examId = :examId AND a.status = 'IN_PROGRESS' ORDER BY a.startedAt DESC")
    Optional<MockExamAttempt> findInProgressAttempt(@Param("userId") Long userId, @Param("examId") String examId);

    @Query("SELECT a FROM MockExamAttempt a WHERE a.userId = :userId ORDER BY a.startedAt DESC")
    List<MockExamAttempt> findAllByUserIdOrderByStartedAtDesc(@Param("userId") Long userId);

    @Query("SELECT COUNT(a) FROM MockExamAttempt a WHERE a.userId = :userId AND a.status = 'COMPLETED'")
    long countCompletedByUserId(@Param("userId") Long userId);
}
