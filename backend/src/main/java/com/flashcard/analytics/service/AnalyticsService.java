package com.flashcard.analytics.service;

import com.flashcard.srs.model.StudySession;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.service.StudySessionHelper;
import com.flashcard.user.model.User;
import com.flashcard.user.provider.UserDataProvider;
import com.flashcard.user.service.OnlineUserService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, LocalDate date) {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = date.atStartOfDay(zone).toInstant();
        java.time.Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);

        return updateStudySessionWithRetry(user, date, (int) uniqueCount, correctAnswers, totalQuestions, null);
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
     * Calculate study streak based on active study sessions in Vietnam timezone
     */
    @Transactional(readOnly = true)
    public int calculateStreak(User user) {
        List<StudySession> sessions = srsDataProvider.findAllStudySessions(user);
        if (sessions.isEmpty()) {
            return 0;
        }

        List<StudySession> activeSessions = sessions;
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate expectedDate = today;
        int streak = 0;

        LocalDate mostRecentDate = activeSessions.get(0).getStudyDate();
        if (!mostRecentDate.equals(today) && !mostRecentDate.equals(today.minusDays(1))) {
            return 0;
        }

        if (mostRecentDate.equals(today.minusDays(1))) {
            expectedDate = today.minusDays(1);
        }

        for (StudySession session : activeSessions) {
            LocalDate date = session.getStudyDate();
            if (date.equals(expectedDate)) {
                streak++;
                expectedDate = expectedDate.minusDays(1);
            } else if (date.isBefore(expectedDate)) {
                break;
            }
        }

        return streak;
    }

    /**
     * Get dashboard stats aggregate including leaderboard, online count, and freeze status
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        long dueCount = srsService.getDueCount(user);
        long learnedCount = srsDataProvider.countLearnedWords(user);
        int currentStreak = calculateStreak(user);

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        int wordsStudiedToday = srsDataProvider.findStudySession(user, today)
                .map(StudySession::getWordsStudied)
                .orElse(0);

        boolean streakFrozenToday = srsDataProvider.findStudySession(user, today)
                .map(StudySession::isStreakFrozen)
                .orElse(false);

        stats.put("dueCount", dueCount);
        stats.put("learnedCount", learnedCount);
        stats.put("wordsStudiedToday", wordsStudiedToday);
        stats.put("streak", currentStreak);
        stats.put("streakFrozenToday", streakFrozenToday);
        stats.put("onlineCount", onlineUserService.getOnlineCount());
        stats.put("totalUsers", userDataProvider.count());
        stats.put("leaderboard", new ArrayList<>());
        stats.put("learnedLeaderboard", srsDataProvider.getLearnedLeaderboard(PageRequest.of(0, 10)));

        // Streak leaderboard
        List<Map<String, Object>> streakLeaderboard = new ArrayList<>();
        Map<String, Object> userStreak = new HashMap<>();
        userStreak.put("username", user.getUsername());
        userStreak.put("avatar", user.getAvatar());
        userStreak.put("streak", currentStreak);
        streakLeaderboard.add(userStreak);
        stats.put("streakLeaderboard", streakLeaderboard);

        // Fetch last 365 days of study history in Vietnam timezone
        LocalDate startDate = today.minusDays(364);
        List<StudySession> recentSessions = srsDataProvider.findStudySessionsBetween(user, startDate, today);

        stats.put("history", recentSessions);

        return stats;
    }

    @Transactional
    public StudySession activateStreakFreeze(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = today.atStartOfDay(zone).toInstant();
        java.time.Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);

        return updateStudySessionWithRetry(user, today, (int) uniqueCount, null, null, true);
    }
}
