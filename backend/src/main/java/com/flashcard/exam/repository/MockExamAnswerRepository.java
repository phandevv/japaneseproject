package com.flashcard.exam.repository;

import com.flashcard.exam.model.MockExamAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamAnswerRepository extends JpaRepository<MockExamAnswer, Long> {

    List<MockExamAnswer> findByAttemptId(Long attemptId);

    List<MockExamAnswer> findByAttemptIdAndSectionId(Long attemptId, String sectionId);

    Optional<MockExamAnswer> findByAttemptIdAndQuestionId(Long attemptId, String questionId);

    @Modifying
    @Transactional
    @Query("DELETE FROM MockExamAnswer a WHERE a.attemptId = :attemptId AND a.sectionId = :sectionId")
    void deleteByAttemptIdAndSectionId(@Param("attemptId") Long attemptId, @Param("sectionId") String sectionId);

    @Query("SELECT COUNT(a) FROM MockExamAnswer a WHERE a.attemptId = :attemptId AND a.correct = true")
    long countCorrectByAttemptId(@Param("attemptId") Long attemptId);
}
