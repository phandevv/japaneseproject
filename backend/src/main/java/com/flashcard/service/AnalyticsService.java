package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.StudySession;
import com.flashcard.repository.StudySessionRepository;
import com.flashcard.repository.WordReviewRepository;
import com.flashcard.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AnalyticsService {

    private final StudySessionRepository sessionRepository;
    private final WordReviewRepository reviewRepository;
    private final SrsService srsService;
    private final OnlineUserService onlineUserService;
    private final UserRepository userRepository;

    public AnalyticsService(StudySessionRepository sessionRepository,
                            WordReviewRepository reviewRepository,
                            SrsService srsService,
                            OnlineUserService onlineUserService,
                            UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.reviewRepository = reviewRepository;
        this.srsService = srsService;
        this.onlineUserService = onlineUserService;
        this.userRepository = userRepository;
    }

    /**
     * Record or update study session statistics for a specific local date
     */
    @Transactional
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, LocalDate date) {
        StudySession session = sessionRepository.findByUserAndStudyDate(user, date)
                .orElseGet(() -> new StudySession(user, date));

        session.setWordsStudied(session.getWordsStudied() + wordsStudied);
        session.setCorrectAnswers(session.getCorrectAnswers() + correctAnswers);
        session.setTotalQuestions(session.getTotalQuestions() + totalQuestions);

        return sessionRepository.save(session);
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

        // Filter sessions to only those where they actually studied or activated streak freeze
        List<StudySession> activeSessions = sessions.stream()
                .filter(s -> s.getWordsStudied() > 0 || s.getTotalQuestions() > 0 || s.isStreakFrozen())
                .toList();

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

        // Calculate streak leaderboard
        List<Map<String, Object>> streakLeaderboard = userRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("username", u.getUsername());
                    map.put("streak", calculateStreak(u));
                    return map;
                })
                .sorted((m1, m2) -> Integer.compare((int) m2.get("streak"), (int) m1.get("streak")))
                .limit(10)
                .toList();
        stats.put("streakLeaderboard", streakLeaderboard);

        // Fetch last 7 days of study history in Vietnam timezone
        LocalDate startDate = today.minusDays(6);
        List<StudySession> recentSessions = sessionRepository.findByUserAndStudyDateBetweenOrderByStudyDateAsc(user, startDate, today);
        
        stats.put("history", recentSessions);

        return stats;
    }

    /**
     * Activate streak freeze for today to shield streak from breaking
     */
    @Transactional
    public StudySession activateStreakFreeze(User user) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        StudySession session = sessionRepository.findByUserAndStudyDate(user, today)
                .orElseGet(() -> new StudySession(user, today));

        session.setStreakFrozen(true);
        return sessionRepository.save(session);
    }
}
