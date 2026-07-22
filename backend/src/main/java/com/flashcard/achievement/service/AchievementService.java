package com.flashcard.achievement.service;

import com.flashcard.achievement.model.Achievement;
import com.flashcard.achievement.model.UserAchievement;
import com.flashcard.achievement.repository.AchievementRepository;
import com.flashcard.achievement.repository.UserAchievementRepository;
import com.flashcard.analytics.service.AnalyticsService;
import com.flashcard.srs.repository.GrammarReviewRepository;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class AchievementService {

    private static final Logger log = LoggerFactory.getLogger(AchievementService.class);

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final AnalyticsService analyticsService;
    private final WordReviewRepository wordReviewRepository;
    private final GrammarReviewRepository grammarReviewRepository;

    public AchievementService(AchievementRepository achievementRepository,
                              UserAchievementRepository userAchievementRepository,
                              AnalyticsService analyticsService,
                              WordReviewRepository wordReviewRepository,
                              GrammarReviewRepository grammarReviewRepository) {
        this.achievementRepository = achievementRepository;
        this.userAchievementRepository = userAchievementRepository;
        this.analyticsService = analyticsService;
        this.wordReviewRepository = wordReviewRepository;
        this.grammarReviewRepository = grammarReviewRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initDefaultAchievements() {
        if (achievementRepository.count() > 0) {
            return;
        }

        log.info("Seeding initial Achievement Tree nodes into database...");

        List<Achievement> initialList = List.of(
            // 🌲 Nhánh 1: STREAK (Khởi Đầu & Chăm Chỉ)
            new Achievement("STREAK_1", "Tập Sự Nhập Môn", "Bắt đầu hành trình học tiếng Nhật và giữ lửa chuỗi học 1 ngày.", "STREAK", "/assets/badge_streak_fire.png", 10, 1, null, 1, 1),
            new Achievement("STREAK_3", "Ngọn Lửa Chuỗi 3 Ngày", "Duy trì chuỗi học liên tục 3 ngày không gián đoạn.", "STREAK", "/assets/badge_streak_fire.png", 30, 3, "STREAK_1", 2, 1),
            new Achievement("STREAK_7", "Kiên Trì 7 Ngày", "Chinh phục cột mốc 7 ngày học tập chăm chỉ.", "STREAK", "/assets/badge_streak_fire.png", 70, 7, "STREAK_3", 3, 1),
            new Achievement("STREAK_30", "Thần Đèn 30 Ngày", "Trở thành chiến thần kiên trì với chuỗi học 30 ngày.", "STREAK", "/assets/badge_streak_fire.png", 300, 30, "STREAK_7", 4, 1),
            new Achievement("STREAK_100", "Bất Tử 100 Ngày", "Huyền thoại chuỗi học 100 ngày liên tục!", "STREAK", "/assets/badge_streak_fire.png", 1000, 100, "STREAK_30", 5, 1),

            // 📚 Nhánh 2: VOCABULARY (Từ Vựng & SRS)
            new Achievement("VOCAB_10", "Mầm Chồi Từ Vựng", "Học thành công 10 từ vựng đầu tiên.", "VOCABULARY", "/assets/badge_vocab_scroll.png", 20, 10, null, 1, 1),
            new Achievement("VOCAB_50", "Thủ Kho N5", "Thuộc lòng và ghi nhớ 50 từ vựng tiếng Nhật.", "VOCABULARY", "/assets/badge_vocab_scroll.png", 100, 50, "VOCAB_10", 2, 1),
            new Achievement("VOCAB_100", "Chinh Phục N4", "Tích lũy 100 từ vựng trong kho trí nhớ.", "VOCABULARY", "/assets/badge_vocab_scroll.png", 200, 100, "VOCAB_50", 3, 1),
            new Achievement("VOCAB_300", "Bậc Thầy JLPT", "Chinh phục mốc 300 từ vựng tiếng Nhật.", "VOCABULARY", "/assets/badge_vocab_scroll.png", 500, 300, "VOCAB_100", 4, 1),
            new Achievement("VOCAB_1000", "Từ Điển Sống", "Thuộc lòng 1000 từ vựng tiếng Nhật chuẩn FSRS!", "VOCABULARY", "/assets/badge_vocab_scroll.png", 2000, 1000, "VOCAB_300", 5, 1),

            // 🎯 Nhánh 3: QUIZ (Thử Thách & Phản Xạ)
            new Achievement("QUIZ_1", "Phát Súng Đầu Tiên", "Hoàn thành 1 bài Quiz kiểm tra.", "QUIZ", "/assets/badge_quiz_katana.png", 15, 1, null, 1, 1),
            new Achievement("QUIZ_REFLEX", "Phản Xạ Ninja", "Đạt tỉ lệ phản xạ Good/Easy trên 80% trong bài Quiz.", "QUIZ", "/assets/badge_quiz_katana.png", 50, 1, "QUIZ_1", 2, 1),
            new Achievement("QUIZ_10", "Chuyên Gia Thử Thách", "Hoàn thành 10 bài Quiz thử thách.", "QUIZ", "/assets/badge_quiz_katana.png", 150, 10, "QUIZ_REFLEX", 3, 1),
            new Achievement("QUIZ_50", "Vua Quiz", "Hoàn thành xuất sắc 50 bài Quiz kiểm tra kiến thức.", "QUIZ", "/assets/badge_quiz_katana.png", 600, 50, "QUIZ_10", 4, 1),

            // 🤖 Nhánh 4: AI_KAIWA (Trợ Lý SIRO AI & Kho Tri Thức)
            new Achievement("AI_CHAT_1", "Kết Nối SIRO AI", "Tương tác thành công 1 câu hỏi với Trợ lý SIRO AI.", "AI_KAIWA", "/assets/badge_ai_robot.png", 15, 1, null, 1, 1),
            new Achievement("AI_KB_5", "Thủ Kho Tri Thức", "Lưu 5 thẻ ngữ pháp hoặc từ vựng vào Kho tri thức cá nhân.", "AI_KAIWA", "/assets/badge_ai_robot.png", 80, 5, "AI_CHAT_1", 2, 1),
            new Achievement("AI_KAIWA_10", "Đàm Thoại Tri Kỷ", "Thực hiện 10 buổi đàm thoại thực tế với SIRO AI.", "AI_KAIWA", "/assets/badge_ai_robot.png", 300, 10, "AI_KB_5", 3, 1),

            // 🏆 Nhánh 5: COMMUNITY (Đóng Góp & Xếp Hạng)
            new Achievement("RANK_TOP10", "Top 10 Bảng Xếp Hạng", "Ghi tên mình vào Top 10 Bảng xếp hạng học tập.", "COMMUNITY", "/assets/badge_crown_gold.png", 200, 1, null, 1, 1),
            new Achievement("FEEDBACK_SUPPORTER", "Cố Vấn Tri Thức", "Gửi báo cáo góp ý để phát triển ứng dụng.", "COMMUNITY", "/assets/badge_crown_gold.png", 50, 1, "RANK_TOP10", 2, 1)
        );

        achievementRepository.saveAll(initialList);
        log.info("Successfully seeded {} achievement nodes.", initialList.size());
    }

    /**
     * Get complete achievement tree & user progress for the current user
     */
    @Transactional
    public List<AchievementProgressDto> getUserAchievements(User user) {
        List<Achievement> achievements = achievementRepository.findAllByOrderByCategoryAscTreeLevelAscOrderInLevelAsc();
        List<UserAchievement> userAchievements = userAchievementRepository.findByUser(user);

        Map<Long, UserAchievement> userMap = new HashMap<>();
        for (UserAchievement ua : userAchievements) {
            userMap.put(ua.getAchievement().getId(), ua);
        }

        List<AchievementProgressDto> result = new ArrayList<>();
        for (Achievement ach : achievements) {
            UserAchievement ua = userMap.get(ach.getId());
            boolean unlocked = ua != null && ua.isUnlocked();
            int progress = ua != null ? ua.getCurrentProgress() : 0;
            Instant unlockedAt = ua != null ? ua.getUnlockedAt() : null;

            result.add(new AchievementProgressDto(
                ach.getId(),
                ach.getCode(),
                ach.getTitle(),
                ach.getDescription(),
                ach.getCategory(),
                ach.getIcon(),
                ach.getPoints(),
                ach.getTargetValue(),
                progress,
                unlocked,
                unlockedAt,
                ach.getParentCode(),
                ach.getTreeLevel(),
                ach.getOrderInLevel()
            ));
        }

        return result;
    }

    /**
     * Check and evaluate all achievement conditions for the specified user
     */
    @Transactional
    public List<AchievementProgressDto> checkAndGrantAchievements(User user) {
        if (user == null) return List.of();

        List<Achievement> achievements = achievementRepository.findAllByOrderByCategoryAscTreeLevelAscOrderInLevelAsc();
        List<UserAchievement> existingUserAch = userAchievementRepository.findByUser(user);

        Map<Long, UserAchievement> userMap = new HashMap<>();
        for (UserAchievement ua : existingUserAch) {
            userMap.put(ua.getAchievement().getId(), ua);
        }

        // Gather real metrics
        int currentStreak = analyticsService.calculateStreak(user);
        long learnedWordsCount = wordReviewRepository.countLearnedWords(user);
        int savedGrammarCount = grammarReviewRepository.findByUserIdAndIsLearned(user.getId(), true).size();

        List<AchievementProgressDto> newlyUnlocked = new ArrayList<>();

        for (Achievement ach : achievements) {
            UserAchievement ua = userMap.get(ach.getId());
            if (ua == null) {
                ua = new UserAchievement(user, ach, 0, false, null);
            }

            if (ua.isUnlocked()) {
                continue;
            }

            int calcProgress;
            switch (ach.getCode()) {
                case "STREAK_1":
                case "STREAK_3":
                case "STREAK_7":
                case "STREAK_30":
                case "STREAK_100":
                    calcProgress = currentStreak;
                    break;
                case "VOCAB_10":
                case "VOCAB_50":
                case "VOCAB_100":
                case "VOCAB_300":
                case "VOCAB_1000":
                    calcProgress = (int) learnedWordsCount;
                    break;
                case "AI_KB_5":
                    calcProgress = savedGrammarCount;
                    break;
                default:
                    calcProgress = ua.getCurrentProgress();
                    break;
            }

            ua.setCurrentProgress(calcProgress);

            if (calcProgress >= ach.getTargetValue()) {
                ua.setUnlocked(true);
                ua.setUnlockedAt(Instant.now());

                newlyUnlocked.add(new AchievementProgressDto(
                    ach.getId(),
                    ach.getCode(),
                    ach.getTitle(),
                    ach.getDescription(),
                    ach.getCategory(),
                    ach.getIcon(),
                    ach.getPoints(),
                    ach.getTargetValue(),
                    calcProgress,
                    true,
                    ua.getUnlockedAt(),
                    ach.getParentCode(),
                    ach.getTreeLevel(),
                    ach.getOrderInLevel()
                ));
            }

            userAchievementRepository.save(ua);
        }

        return newlyUnlocked;
    }

    /**
     * Increment progress for custom action-triggered achievements (e.g., Quiz completed, Feedback sent)
     */
    @Transactional
    public void incrementProgress(User user, String achievementCode, int delta) {
        if (user == null) return;
        Optional<Achievement> achOpt = achievementRepository.findByCode(achievementCode);
        if (achOpt.isEmpty()) return;

        Achievement ach = achOpt.get();
        UserAchievement ua = userAchievementRepository.findByUserAndAchievement(user, ach)
                .orElseGet(() -> new UserAchievement(user, ach, 0, false, null));

        if (!ua.isUnlocked()) {
            int newProgress = ua.getCurrentProgress() + delta;
            ua.setCurrentProgress(newProgress);
            if (newProgress >= ach.getTargetValue()) {
                ua.setUnlocked(true);
                ua.setUnlockedAt(Instant.now());
            }
            userAchievementRepository.save(ua);
        }
    }

    // Pure DTO record for clean JSON output
    public record AchievementProgressDto(
        Long id,
        String code,
        String title,
        String description,
        String category,
        String icon,
        int points,
        int targetValue,
        int currentProgress,
        boolean isUnlocked,
        Instant unlockedAt,
        String parentCode,
        int treeLevel,
        int orderInLevel
    ) {}
}
