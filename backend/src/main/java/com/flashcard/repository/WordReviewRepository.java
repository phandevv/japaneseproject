package com.flashcard.repository;

import com.flashcard.model.User;
import com.flashcard.model.Vocabulary;
import com.flashcard.model.WordReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface WordReviewRepository extends JpaRepository<WordReview, Long> {

    Optional<WordReview> findByUserAndVocabulary(User user, Vocabulary vocabulary);

    List<WordReview> findByUserAndNextReviewBefore(User user, Instant time);

    long countByUserAndNextReviewBefore(User user, Instant time);

    @Query("SELECT COUNT(wr) FROM WordReview wr WHERE wr.user = :user AND wr.intervalDays > 0")
    long countLearnedWords(@Param("user") User user);
}
