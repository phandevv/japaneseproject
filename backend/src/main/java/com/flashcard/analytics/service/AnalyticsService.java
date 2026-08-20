package com.flashcard.analytics.service;

import com.flashcard.srs.model.StudySession;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.service.StudySessionHelper;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import com.flashcard.user.service.OnlineUserService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class AnalyticsService {

    private final SrsDataProvider srsDataProvider;
    private final SrsService srsService;
    private final OnlineUserService onlineUserService;
    private final UserDataProvider userDataProvider;
    private final StudySessionHelper studySessionHelper;

    public AnalyticsService(SrsDataProvider srsDataProvider,
                            SrsService srsService,
                            OnlineUserService onlineUserService,
                            UserDataProvider userDataProvider,
                            StudySessionHelper studySessionHelper) {
        this.srsDataProvider = srsDataProvider;
        this.srsService = srsService;
        this.onlineUserService = onlineUserService;
        this.userDataProvider = userDataProvider;
        this.studySessionHelper = studySessionHelper;
    }

    /**
     * Record or update study session statistics for a specific local date
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, LocalDate date) {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = date.atStartOfDay(zone).toInstant();
        java.time.Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);
        int finalWordsStudied = Math.max(wordsStudied, (int) uniqueCount);

        return updateStudySessionWithRetry(user, date, finalWordsStudied, correctAnswers, totalQuestions, null);
    }

    private StudySession updateStudySessionWithRetry(User user, LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze) {
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                return studySessionHelper.saveOrUpdateSessionWithNewTransaction(user, date, wordsStudied, addCorrect, addTotal, freeze);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                if (i == maxRetries - 1) throw e;
                try {
                    Thread.sleep(50);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        return null;
    }

    /**
     * Calculate current streak of consecutive days studied.
     */
    public int calculateStreak(User user) {
        List<StudySession> sessions = srsDataProvider.findAllStudySessions(user);
        if (sessions.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate yesterday = today.minusDays(1);

        java.util.Set<LocalDate> dateSet = new java.util.HashSet<>();
        for (StudySession session : sessions) {
            if (session.getStudyDate() != null && (session.getWordsStudied() > 0 || session.isStreakFrozen())) {
                dateSet.add(session.getStudyDate());
            }
        }

        int streak = 0;
        LocalDate checkDate = today;
        if (!dateSet.contains(checkDate)) {
            checkDate = yesterday;
        }
        while (dateSet.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        return streak;
    }

    /**
     * Get dashboard stats aggregate including leaderboard, online count, and freeze status.
     * Parallelized via CompletableFuture for instant response times.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "dashboard", key = "#user.id")
    public Map<String, Object> getDashboardStats(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate startDate = today.minusDays(364);

        // Run independent queries concurrently
        CompletableFuture<Long> dueCountFuture = CompletableFuture.supplyAsync(() -> srsService.getDueCount(user));
        CompletableFuture<Long> learnedCountFuture = CompletableFuture.supplyAsync(() -> srsDataProvider.countLearnedWords(user));
        CompletableFuture<Integer> streakFuture = CompletableFuture.supplyAsync(() -> calculateStreak(user));
        CompletableFuture<List<StudySession>> historyFuture = CompletableFuture.supplyAsync(() -> srsDataProvider.findStudySessionsBetween(user, startDate, today));
        CompletableFuture<Long> totalUsersFuture = CompletableFuture.supplyAsync(() -> userDataProvider.count());
        CompletableFuture<List<Map<String, Object>>> todayLeaderboardFuture = CompletableFuture.supplyAsync(() -> srsDataProvider.getTodayLeaderboard(today, PageRequest.of(0, 10)));
        CompletableFuture<List<Map<String, Object>>> learnedLeaderboardFuture = CompletableFuture.supplyAsync(() -> srsDataProvider.getLearnedLeaderboard(PageRequest.of(0, 10)));
        CompletableFuture<List<Map<String, Object>>> streakLeaderboardFuture = CompletableFuture.supplyAsync(() -> srsDataProvider.getStreakLeaderboard(PageRequest.of(0, 10)));

        // Today session info
        StudySession todaySession = srsDataProvider.findStudySession(user, today).orElse(null);
        int wordsStudiedToday = todaySession != null ? todaySession.getWordsStudied() : 0;
        boolean streakFrozenToday = todaySession != null && todaySession.isStreakFrozen();

        if (wordsStudiedToday == 0) {
            java.time.Instant start = today.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            java.time.Instant end = today.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);
            if (uniqueCount > 0) {
                wordsStudiedToday = (int) uniqueCount;
            }
        }

        // Wait for all futures
        CompletableFuture.allOf(
                dueCountFuture, learnedCountFuture, streakFuture, historyFuture,
                totalUsersFuture, todayLeaderboardFuture, learnedLeaderboardFuture, streakLeaderboardFuture
        ).join();

        Map<String, Object> stats = new HashMap<>();
        stats.put("dueCount", dueCountFuture.join());
        stats.put("learnedCount", learnedCountFuture.join());
        stats.put("wordsStudiedToday", wordsStudiedToday);
        stats.put("streak", streakFuture.join());
        stats.put("streakFrozenToday", streakFrozenToday);
        stats.put("onlineCount", onlineUserService.getOnlineCount());
        stats.put("totalUsers", totalUsersFuture.join());
        stats.put("leaderboard", todayLeaderboardFuture.join());
        stats.put("learnedLeaderboard", learnedLeaderboardFuture.join());
        stats.put("streakLeaderboard", streakLeaderboardFuture.join());
        stats.put("history", historyFuture.join());

        return stats;
    }

    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession activateStreakFreeze(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = today.atStartOfDay(zone).toInstant();
        java.time.Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);

        return updateStudySessionWithRetry(user, today, (int) uniqueCount, null, null, true);
    }
}
