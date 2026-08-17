package com.flashcard.srs.provider;

import com.flashcard.knowledge.model.GrammarCard;
import com.flashcard.srs.model.*;
import com.flashcard.srs.repository.*;
import com.flashcard.user.model.User;
import com.flashcard.vocabulary.model.Vocabulary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "app.database.type", havingValue = "mysql", matchIfMissing = true)
public class SrsJpaDataProvider implements SrsDataProvider {

    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;
    private final ReviewLogRepository reviewLogRepository;
    private final StudySessionRepository studySessionRepository;
    private final DailyStudyStatsRepository dailyStudyStatsRepository;

    @Autowired
    public SrsJpaDataProvider(WordReviewRepository wordReviewRepository,
                              GrammarReviewRepository grammarReviewRepository,
                              ReviewLogRepository reviewLogRepository,
                              StudySessionRepository studySessionRepository,
                              DailyStudyStatsRepository dailyStudyStatsRepository) {
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
        this.reviewLogRepository = reviewLogRepository;
        this.studySessionRepository = studySessionRepository;
        this.dailyStudyStatsRepository = dailyStudyStatsRepository;
    }

    @Override
    public Optional<WordReview> findByUserAndVocabulary(User user, Vocabulary vocabulary) {
        return wordReviewRepository.findByUserAndVocabulary(user, vocabulary);
    }

    @Override
    public List<WordReview> findDueWordReviews(User user, Instant time) {
        return wordReviewRepository.findByUserAndNextReviewBefore(user, time);
    }

    @Override
    public long countDueWordReviews(User user, Instant time) {
        return wordReviewRepository.countByUserAndNextReviewBefore(user, time);
    }

    @Override
    public long countLearnedWords(User user) {
        return wordReviewRepository.countLearnedWords(user);
    }

    @Override
    public List<Map<String, Object>> getLearnedLeaderboard(Pageable pageable) {
        return wordReviewRepository.getLearnedLeaderboard(pageable);
    }

    @Override
    public List<WordReview> findAllLearnedByUser(User user) {
        return wordReviewRepository.findAllLearnedByUser(user);
    }

    @Override
    public List<Vocabulary> findLearnedVocabulariesByUser(User user, Pageable pageable) {
        return wordReviewRepository.findLearnedVocabulariesByUser(user, pageable);
    }

    @Override
    public List<WordReview> findAllByUser(User user) {
        return wordReviewRepository.findAllByUserFetchVocabulary(user);
    }

    @Override
    public long countUniqueReviewedToday(User user, Instant start, Instant end) {
        return wordReviewRepository.countUniqueReviewedToday(user, start, end);
    }

    @Override
    public Page<WordReview> findByUserAndLastReviewedAtBetween(User user, Instant start, Instant end, Pageable pageable) {
        return wordReviewRepository.findByUserAndLastReviewedAtBetween(user, start, end, pageable);
    }

    @Override
    public Page<WordReview> findByUserAndLastReviewedAtBetweenAndRatingIn(User user, Instant start, Instant end, List<Integer> ratings, Pageable pageable) {
        return wordReviewRepository.findByUserAndLastReviewedAtBetweenAndRatingIn(user, start, end, ratings, pageable);
    }

    @Override
    public List<WordReview> findMorningReviewQueue(User user, Instant dueThreshold, Instant yesterdayStart, Instant yesterdayEnd) {
        return wordReviewRepository.findMorningReviewQueue(user, dueThreshold, yesterdayStart, yesterdayEnd);
    }

    @Override
    public WordReview saveWordReview(WordReview review) {
        return wordReviewRepository.save(review);
    }

    @Override
    public void saveReviewLog(ReviewLog log) {
        reviewLogRepository.save(log);
    }

    @Override
    public void deleteWordReview(WordReview review) {
        wordReviewRepository.delete(review);
    }

    @Override
    public void deleteWordReviewsByVocabularies(List<Vocabulary> vocabularies) {
        wordReviewRepository.deleteByVocabularyIn(vocabularies);
    }

    @Override
    public Optional<GrammarReview> findGrammarReview(Long userId, Long grammarId) {
        return grammarReviewRepository.findByUserIdAndGrammarCardId(userId, grammarId);
    }

    @Override
    public List<GrammarReview> findGrammarReviewsByUser(Long userId) {
        return grammarReviewRepository.findByUserId(userId);
    }

    @Override
    public GrammarReview saveGrammarReview(GrammarReview review) {
        return grammarReviewRepository.save(review);
    }

    @Override
    public void deleteGrammarReview(GrammarReview review) {
        grammarReviewRepository.delete(review);
    }

    @Override
    public Optional<StudySession> findStudySession(User user, LocalDate date) {
        return studySessionRepository.findByUserAndStudyDate(user, date);
    }

    @Override
    public StudySession saveStudySession(StudySession session) {
        return studySessionRepository.save(session);
    }

    @Override
    public List<StudySession> findStudySessionsBetween(User user, LocalDate start, LocalDate end) {
        return studySessionRepository.findByUserAndStudyDateBetweenOrderByStudyDateAsc(user, start, end);
    }

    @Override
    public List<StudySession> findAllStudySessions(User user) {
        return studySessionRepository.findRecentSessions(user);
    }

    @Override
    public Optional<DailyStudyStats> findDailyStats(User user, LocalDate date) {
        return dailyStudyStatsRepository.findByUserAndDate(user, date);
    }

    @Override
    public DailyStudyStats saveDailyStats(DailyStudyStats stats) {
        return dailyStudyStatsRepository.save(stats);
    }

    @Override
    public List<DailyStudyStats> findDailyStatsBetween(User user, LocalDate start, LocalDate end) {
        return dailyStudyStatsRepository.findByUserAndDateBetweenOrderByDateAsc(user, start, end);
    }
}
