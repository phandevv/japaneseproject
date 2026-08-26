package com.flashcard.analytics.service;

import com.flashcard.analytics.document.StreakRepairLogDoc;
import com.flashcard.analytics.repository.mongo.StreakRepairLogMongoRepository;
import com.flashcard.common.service.SequenceGeneratorService;
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
    private final StreakRepairLogMongoRepository streakRepairLogMongoRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    public AnalyticsService(SrsDataProvider srsDataProvider,
                             SrsService srsService,
                             OnlineUserService onlineUserService,
                             UserDataProvider userDataProvider,
                             StudySessionHelper studySessionHelper,
                             StreakRepairLogMongoRepository streakRepairLogMongoRepository,
                             SequenceGeneratorService sequenceGeneratorService) {
        this.srsDataProvider = srsDataProvider;
        this.srsService = srsService;
        this.onlineUserService = onlineUserService;
        this.userDataProvider = userDataProvider;
        this.studySessionHelper = studySessionHelper;
        this.streakRepairLogMongoRepository = streakRepairLogMongoRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
    }

    /**
     * Record or update study session statistics for a specific local date
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, LocalDate date) {
        return recordSession(user, wordsStudied, correctAnswers, totalQuestions, 0, date);
    }

    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public StudySession recordSession(User user, int wordsStudied, int correctAnswers, int totalQuestions, int durationMinutes, LocalDate date) {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.Instant start = date.atStartOfDay(zone).toInstant();
        java.time.Instant end = date.plusDays(1).atStartOfDay(zone).toInstant();
        long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);
        int finalWordsStudied = Math.max(wordsStudied, (int) uniqueCount);

        return updateStudySessionWithRetry(user, date, finalWordsStudied, correctAnswers, totalQuestions, null, durationMinutes, null);
    }

    private StudySession updateStudySessionWithRetry(User user, LocalDate date, int wordsStudied, Integer addCorrect, Integer addTotal, Boolean freeze, Integer addDurationMinutes, Boolean isRepaired) {
        int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                return studySessionHelper.saveOrUpdateSessionWithNewTransaction(user, date, wordsStudied, addCorrect, addTotal, freeze, addDurationMinutes, isRepaired);
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
            if (session.getStudyDate() != null) {
                dateSet.add(session.getStudyDate());
            }
        }

        if (dateSet.isEmpty()) {
            return 0;
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

    public long getRepairsUsedToday(User user, LocalDate today) {
        if (user == null || user.getId() == null) return 0;
        return streakRepairLogMongoRepository.countByUserIdAndRepairedOnDate(user.getId(), today);
    }

    public long getRepairsUsedThisMonth(User user, LocalDate today) {
        if (user == null || user.getId() == null) return 0;
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        List<StreakRepairLogDoc> logs = streakRepairLogMongoRepository.findByUserIdAndRepairedOnDateBetween(user.getId(), startOfMonth, endOfMonth);
        return logs.size();
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

        // Ensure daily session check-in exists for today upon accessing dashboard
        studySessionHelper.ensureDailySession(user, today);

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
        int todayDurationMinutes = todaySession != null ? todaySession.getDurationMinutes() : 0;

        if (wordsStudiedToday == 0) {
            java.time.Instant start = today.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            java.time.Instant end = today.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
            long uniqueCount = srsDataProvider.countUniqueReviewedToday(user, start, end);
            if (uniqueCount > 0) {
                wordsStudiedToday = (int) uniqueCount;
            }
        }

        long repairsUsedToday = getRepairsUsedToday(user, today);
        long repairsUsedThisMonth = getRepairsUsedThisMonth(user, today);
        boolean canRepairToday = (todayDurationMinutes >= 60) && (repairsUsedToday < 1) && (repairsUsedThisMonth < 5);

        // Wait for all futures
        CompletableFuture.allOf(
                dueCountFuture, learnedCountFuture, streakFuture, historyFuture,
                totalUsersFuture, todayLeaderboardFuture, learnedLeaderboardFuture, streakLeaderboardFuture
        ).join();

        Map<String, Object> stats = new HashMap<>();
        stats.put("dueCount", dueCountFuture.join());
        stats.put("learnedCount", learnedCountFuture.join());
        stats.put("wordsStudiedToday", wordsStudiedToday);
        stats.put("todayDurationMinutes", todayDurationMinutes);
        stats.put("streak", streakFuture.join());
        stats.put("streakFrozenToday", streakFrozenToday);
        stats.put("repairsUsedToday", repairsUsedToday);
        stats.put("repairsUsedThisMonth", repairsUsedThisMonth);
        stats.put("maxRepairsPerMonth", 5);
        stats.put("canRepairToday", canRepairToday);
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

        return updateStudySessionWithRetry(user, today, (int) uniqueCount, null, null, true, null, null);
    }

    /**
     * Perform streak repair (Điểm danh bù) for a past missed date
     */
    @Transactional
    @CacheEvict(value = {"dashboard", "leaderboard"}, allEntries = true)
    public Map<String, Object> repairStreak(User user, LocalDate targetDate) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("Vui lòng đăng nhập để thực hiện điểm danh bù.");
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        if (targetDate == null || !targetDate.isBefore(today)) {
            throw new IllegalArgumentException("Chỉ được phép điểm danh bù cho các ngày trong quá khứ.");
        }

        // Rule 1: Check today's study duration >= 60 minutes
        StudySession todaySession = srsDataProvider.findStudySession(user, today).orElse(null);
        int todayDuration = todaySession != null ? todaySession.getDurationMinutes() : 0;
        if (todayDuration < 60) {
            throw new IllegalArgumentException("Bạn cần học tối thiểu 60 phút hôm nay để mở khóa 1 lượt điểm danh bù (Hiện tại: " + todayDuration + "/60 phút).");
        }

        // Rule 2: Max 1 repair per day
        long repairsToday = getRepairsUsedToday(user, today);
        if (repairsToday >= 1) {
            throw new IllegalArgumentException("Bạn đã sử dụng tối đa 1 lượt điểm danh bù trong ngày hôm nay.");
        }

        // Rule 3: Max 5 repairs per month
        long repairsThisMonth = getRepairsUsedThisMonth(user, today);
        if (repairsThisMonth >= 5) {
            throw new IllegalArgumentException("Bạn đã dùng hết 5 lượt điểm danh bù trong tháng này (" + repairsThisMonth + "/5 lượt).");
        }

        // Rule 4: Check if targetDate was already attended / repaired / frozen
        StudySession targetSession = srsDataProvider.findStudySession(user, targetDate).orElse(null);
        if (targetSession != null && (targetSession.getWordsStudied() > 0 || targetSession.isStreakFrozen() || targetSession.isRepaired())) {
            throw new IllegalArgumentException("Ngày " + targetDate + " đã được điểm danh hoặc hoàn thành trước đó.");
        }

        // Execute repair for targetDate
        studySessionHelper.saveOrUpdateSessionWithNewTransaction(
                user, targetDate, 1, 1, 1, false, 0, true
        );

        // Record StreakRepairLogDoc
        StreakRepairLogDoc repairLog = new StreakRepairLogDoc(
                sequenceGeneratorService.generateSequence("streak_repair_logs_seq"),
                user.getId(),
                targetDate,
                today,
                java.time.Instant.now()
        );
        streakRepairLogMongoRepository.save(repairLog);

        // Recalculate streak
        int newStreak = calculateStreak(user);

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Điểm danh bù thành công cho ngày " + targetDate + "! 🌸");
        result.put("targetDate", targetDate.toString());
        result.put("newStreak", newStreak);
        result.put("repairsUsedToday", repairsToday + 1);
        result.put("repairsUsedThisMonth", repairsThisMonth + 1);
        result.put("remainingRepairsThisMonth", 5 - (repairsThisMonth + 1));
        return result;
    }
}

