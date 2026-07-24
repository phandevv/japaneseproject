package com.flashcard.analytics.service;

import com.flashcard.srs.service.SrsService;
import com.flashcard.srs.service.StudySessionHelper;
import com.flashcard.user.service.OnlineUserService;
import com.flashcard.user.model.User;
import com.flashcard.srs.model.StudySession;
import com.flashcard.srs.repository.StudySessionRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyticsService {

    private final StudySessionRepository sessionRepository;
    private final WordReviewRepository reviewRepository;
    private final SrsService srsService;
    private final OnlineUserService onlineUserService;
    private final UserRepository userRepository;
    private final StudySessionHelper studySessionHelper;

    public AnalyticsService(StudySessionRepository sessionRepository,
                            WordReviewRepository reviewRepository,
                            SrsService srsService,
                            OnlineUserService onlineUserService,
                            UserRepository userRepository,
                            StudySessionHelper studySessionHelper) {
        this.sessionRepository = sessionRepository;
        this.reviewRepository = reviewRepository;
        this.srsService = srsService;
        this.onlineUserService = onlineUserService;
        this.userRepository = userRepository;
        this.studySessionHelper = studySessionHelper;
    }

    /**
     * Record or update study session statistics for a specific local date
     */
    @Transactional
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, LocalDate date) {
        // Calculate unique words studied today with quality >= 3 (Good or Easy)
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = date.atStartOfDay(zone).toInstant();
        java.time.Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = reviewRepository.countUniqueReviewedToday(user, start, end);

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
        List<StudySession> sessions = sessionRepository.findRecentSessions(user);
        if (sessions.isEmpty()) {
            return 0;
        }

        // All sessions count towards streak (opening app creates a session)
        List<StudySession> activeSessions = sessions;

        if (activeSessions.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDate expectedDate = today;
        int streak = 0;

        // Check if the most recent active session is today or yesterday. If older, streak is 0.
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
                // Gap detected — streak broken
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
        long learnedCount = reviewRepository.countLearnedWords(user);
        int currentStreak = calculateStreak(user);

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        int wordsStudiedToday = sessionRepository.findByUserAndStudyDate(user, today)
                .map(StudySession::getWordsStudied)
                .orElse(0);

        boolean streakFrozenToday = sessionRepository.findByUserAndStudyDate(user, today)
                .map(StudySession::isStreakFrozen)
                .orElse(false);

        stats.put("dueCount", dueCount);
        stats.put("learnedCount", learnedCount);
        stats.put("wordsStudiedToday", wordsStudiedToday);
        stats.put("streak", currentStreak);
        stats.put("streakFrozenToday", streakFrozenToday);
        stats.put("onlineCount", onlineUserService.getOnlineCount());
        stats.put("totalUsers", userRepository.count());
        stats.put("leaderboard", sessionRepository.getLeaderboardForDate(today, PageRequest.of(0, 10)));
        stats.put("learnedLeaderboard", reviewRepository.getLearnedLeaderboard(PageRequest.of(0, 10)));

        // Calculate streak leaderboard (scoped to recent active users in last 14 days for high performance)
        LocalDate minDate = today.minusDays(14);
        List<User> candidateUsers = sessionRepository.findRecentActiveUsers(minDate);
        if (candidateUsers == null || candidateUsers.isEmpty()) {
            candidateUsers = userRepository.findAll(PageRequest.of(0, 15)).getContent();
        }

        List<Map<String, Object>> streakLeaderboard = candidateUsers.stream()
                .map(u -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("username", u.getUsername());
                    map.put("avatar", u.getAvatar());
                    map.put("streak", calculateStreak(u));
                    return map;
                })
                .sorted((m1, m2) -> Integer.compare((int) m2.get("streak"), (int) m1.get("streak")))
                .limit(10)
                .toList();
        stats.put("streakLeaderboard", streakLeaderboard);

        // Fetch last 365 days of study history in Vietnam timezone
        LocalDate startDate = today.minusDays(364);
        List<StudySession> recentSessions = sessionRepository.findByUserAndStudyDateBetweenOrderByStudyDateAsc(user, startDate, today);
        
        stats.put("history", recentSessions);

        return stats;
    }

    @Transactional
    public StudySession activateStreakFreeze(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        
        // Calculate unique words studied today
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = today.atStartOfDay(zone).toInstant();
        java.time.Instant end = today.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = reviewRepository.countUniqueReviewedToday(user, start, end);

        return updateStudySessionWithRetry(user, today, (int) uniqueCount, null, null, true);
    }
}

