package com.flashcard.exam.repository.mongo;

import com.flashcard.exam.document.MockExamAttemptDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockExamAttemptMongoRepository extends MongoRepository<MockExamAttemptDoc, Long> {

    List<MockExamAttemptDoc> findAllByUserIdOrderByStartedAtDesc(Long userId);

    Optional<MockExamAttemptDoc> findByIdAndUserId(Long id, Long userId);

    List<MockExamAttemptDoc> findAllByUserIdAndExamIdOrderByStartedAtDesc(Long userId, String examId);

    Optional<MockExamAttemptDoc> findFirstByUserIdAndExamIdAndStatusOrderByStartedAtDesc(Long userId, String examId, String status);
}
