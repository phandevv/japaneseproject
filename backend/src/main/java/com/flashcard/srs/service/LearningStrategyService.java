package com.flashcard.srs.service;

import com.flashcard.user.service.UserSettingService;
import com.flashcard.srs.model.DailyStudyStats;
import com.flashcard.user.model.User;
import com.flashcard.srs.repository.DailyStudyStatsRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class LearningStrategyService {

    private final DailyStudyStatsRepository dailyStudyStatsRepository;
    private final UserSettingService userSettingService;

    public LearningStrategyService(DailyStudyStatsRepository dailyStudyStatsRepository, UserSettingService userSettingService) {
        this.dailyStudyStatsRepository = dailyStudyStatsRepository;
        this.userSettingService = userSettingService;
    }


    private static final int MAX_NEW_WORDS_LIMIT = 30;
    private static final int MIN_NEW_WORDS_LIMIT = 5;
    private static final float TARGET_RETENTION_RATE = 0.85f; // 85%

    /**
     * Tính toán giới hạn thẻ mới (New Words) cho ngày hôm nay 
     * dựa trên độ chính xác (Accuracy / Retention Rate) của ngày hôm trước.
     */
    public int calculateTodayNewWordsLimit(User user, String level) {
        int baseLimit = userSettingService.getWordsPerDay(user, level);
        
        LocalDate yesterday = LocalDate.now().minusDays(1);
        Optional<DailyStudyStats> statsOpt = dailyStudyStatsRepository.findByUserAndDate(user, yesterday);

        if (statsOpt.isEmpty()) {
            return baseLimit;
        }

        DailyStudyStats yesterdayStats = statsOpt.get();
        
        // Nếu hôm qua không học ôn tập nào, giữ nguyên base limit
        if (yesterdayStats.getWordsReviewed() == 0) {
            return baseLimit;
        }

        float accuracy = yesterdayStats.getRetentionRate();
        
        // Điều chỉnh theo accuracy
        int adjustment = 0;
        if (accuracy > 0.90f) {
            adjustment = 5; // Nếu rất tốt, tăng nhẹ số lượng từ
        } else if (accuracy >= TARGET_RETENTION_RATE) {
            adjustment = 0;
        } else if (accuracy >= 0.70f) {
            adjustment = -5; // Hơi kém, giảm tải
        } else {
            adjustment = -10; // Rất kém, giảm tải mạnh
        }

        int newLimit = baseLimit + adjustment;
        
        // Giới hạn tuyệt đối để tránh việc con số quá khổng lồ hoặc về số âm
        int upperLimit = Math.max(MAX_NEW_WORDS_LIMIT, baseLimit + 10);
        int lowerLimit = Math.min(MIN_NEW_WORDS_LIMIT, Math.max(0, baseLimit - 10));
        
        return Math.min(Math.max(newLimit, lowerLimit), upperLimit);
    }
}

