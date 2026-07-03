package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.StudySession;
import com.flashcard.repository.StudySessionRepository;
import com.flashcard.repository.WordReviewRepository;
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

    public AnalyticsService(StudySessionRepository sessionRepository,
                            WordReviewRepository reviewRepository,
                            SrsService srsService) {
        this.sessionRepository = sessionRepository;
        this.reviewRepository = reviewRepository;
        this.srsService = srsService;
    }

    /**
     * Record or update study session statistics for today
     */
    @Transactional
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions) {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        StudySession session = sessionRepository.findByUserAndStudyDate(user, today)
                .orElseGet(() -> new StudySession(user, today));

        session.setWordsStudied(session.getWordsStudied() + wordsStudied);
        session.setCorrectAnswers(session.getCorrectAnswers() + correctAnswers);
        session.setTotalQuestions(session.getTotalQuestions() + totalQuestions);

        return sessionRepository.save(session);
    }

    /**
     * Calculate study streak based on study history logs in database
     */
    @Transactional(readOnly = true)
    public int calculateStreak(User user) {
        List<StudySession> sessions = sessionRepository.findRecentSessions(user);
        if (sessions.isEmpty()) {
            return 0;
        }

        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate expectedDate = today;
        int streak = 0;

        // Check if the most recent session is today or yesterday. If older, streak is 0.
        LocalDate mostRecentDate = sessions.get(0).getStudyDate();
        if (!mostRecentDate.equals(today) && !mostRecentDate.equals(today.minusDays(1))) {
            return 0;
        }

        if (mostRecentDate.equals(today.minusDays(1))) {
            expectedDate = today.minusDays(1);
        }

        for (StudySession session : sessions) {
            LocalDate date = session.getStudyDate();
            if (date.equals(expectedDate)) {
                // User studied on this day, increment streak and expect previous day
                if (session.getWordsStudied() > 0 || session.getTotalQuestions() > 0) {
                    streak++;
                    expectedDate = expectedDate.minusDays(1);
                }
            } else if (date.isBefore(expectedDate)) {
                // Gap detected — streak broken
                break;
            }
        }

        return streak;
    }

    /**
     * Get dashboard stats aggregate
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(User user) {
        Map<String, Object> stats = new HashMap<>();
        
        long dueCount = srsService.getDueCount(user);
        long learnedCount = reviewRepository.countLearnedWords(user);
        int currentStreak = calculateStreak(user);

        stats.put("dueCount", dueCount);
        stats.put("learnedCount", learnedCount);
        stats.put("streak", currentStreak);

        // Fetch last 30 days of study history
        LocalDate endDate = LocalDate.now(ZoneId.systemDefault());
        LocalDate startDate = endDate.minusDays(29);
        List<StudySession> recentSessions = sessionRepository.findByUserAndStudyDateBetweenOrderByStudyDateAsc(user, startDate, endDate);
        
        stats.put("history", recentSessions);

        return stats;
    }
}
