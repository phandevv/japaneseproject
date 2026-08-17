package com.flashcard.srs.provider;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.srs.model.*;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface SrsDataProvider {
    // Word Review
    Optional<WordReview> findByUserAndVocabulary(User user, Vocabulary vocabulary);
    List<WordReview> findDueWordReviews(User user, Instant time);
    long countDueWordReviews(User user, Instant time);
    long countLearnedWords(User user);
    List<Map<String, Object>> getLearnedLeaderboard(Pageable pageable);
    List<WordReview> findAllLearnedByUser(User user);
    List<Vocabulary> findLearnedVocabulariesByUser(User user, Pageable pageable);
    List<WordReview> findAllByUser(User user);
    long countUniqueReviewedToday(User user, Instant start, Instant end);
    Page<WordReview> findByUserAndLastReviewedAtBetween(User user, Instant start, Instant end, Pageable pageable);
    Page<WordReview> findByUserAndLastReviewedAtBetweenAndRatingIn(User user, Instant start, Instant end, List<Integer> ratings, Pageable pageable);
    List<WordReview> findMorningReviewQueue(User user, Instant dueThreshold, Instant yesterdayStart, Instant yesterdayEnd);
    WordReview saveWordReview(WordReview review);
    void saveReviewLog(ReviewLog log);
    void deleteWordReview(WordReview review);
    void deleteWordReviewsByVocabularies(List<Vocabulary> vocabularies);

    // Grammar Review
    Optional<GrammarReview> findGrammarReview(Long userId, Long grammarId);
    List<GrammarReview> findGrammarReviewsByUser(Long userId);
    GrammarReview saveGrammarReview(GrammarReview review);
    void deleteGrammarReview(GrammarReview review);

    // Study Sessions
    Optional<StudySession> findStudySession(User user, LocalDate date);
    StudySession saveStudySession(StudySession session);
    List<StudySession> findStudySessionsBetween(User user, LocalDate start, LocalDate end);
    List<StudySession> findAllStudySessions(User user);

    // Daily Study Stats
    Optional<DailyStudyStats> findDailyStats(User user, LocalDate date);
    DailyStudyStats saveDailyStats(DailyStudyStats stats);
    List<DailyStudyStats> findDailyStatsBetween(User user, LocalDate start, LocalDate end);
}
