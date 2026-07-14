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

    @Query("SELECT wr FROM WordReview wr JOIN FETCH wr.vocabulary WHERE wr.user = :user AND wr.nextReview < :time")
    List<WordReview> findByUserAndNextReviewBefore(@Param("user") User user, @Param("time") Instant time);

    long countByUserAndNextReviewBefore(User user, Instant time);

    @Query("SELECT COUNT(wr) FROM WordReview wr WHERE wr.user = :user AND wr.intervalDays > 0")
    long countLearnedWords(@Param("user") User user);

    @Query("SELECT wr.user.username as username, wr.user.avatar as avatar, COUNT(wr) as learnedCount " +
           "FROM WordReview wr WHERE wr.intervalDays > 0 " +
           "GROUP BY wr.user.username, wr.user.avatar " +
           "ORDER BY COUNT(wr) DESC")
    List<java.util.Map<String, Object>> getLearnedLeaderboard(org.springframework.data.domain.Pageable pageable);

    @Query("SELECT wr FROM WordReview wr JOIN FETCH wr.vocabulary WHERE wr.user = :user AND wr.intervalDays > 0")
    List<WordReview> findAllLearnedByUser(@Param("user") User user);

    @Query("SELECT wr FROM WordReview wr JOIN FETCH wr.vocabulary WHERE wr.user = :user")
    List<WordReview> findAllByUserFetchVocabulary(@Param("user") User user);


    @Query("SELECT COUNT(wr) FROM WordReview wr WHERE wr.user = :user " +
           "AND wr.lastReviewedAt >= :start " +
           "AND wr.lastReviewedAt < :end " +
           "AND wr.lastRating >= 3")
    long countUniqueReviewedToday(@Param("user") User user,
                                  @Param("start") Instant start,
                                  @Param("end") Instant end);
}
