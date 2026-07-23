package com.flashcard.knowledge.service;

import com.flashcard.user.model.User;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.repository.WordReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    @Autowired
    private WordReviewRepository wordReviewRepository;

    /**
     * Lấy danh sách các từ cần ôn tập (Morning Review Queue) dựa trên Priority Score.
     * Bào gồm tất cả từ quá hạn, từ đến hạn hôm nay, và ĐẶC BIỆT từ vừa mới học/ôn ngày hôm qua.
     */
    public List<WordReview> getReviewQueue(User user, int limit) {
        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(zone);
        
        // 1. Threshold: End of today local time
        java.time.Instant dueThreshold = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();

        // 2. Yesterday range (00:00:00 to 23:59:59 yesterday)
        java.time.ZonedDateTime yesterdayStart = nowZoned.minusDays(1).toLocalDate().atStartOfDay(zone);
        java.time.Instant yStart = yesterdayStart.toInstant();
        java.time.Instant yEnd = yesterdayStart.plusDays(1).toInstant();

        List<WordReview> dueReviews = wordReviewRepository.findMorningReviewQueue(user, dueThreshold, yStart, yEnd);
        if (dueReviews == null || dueReviews.isEmpty()) {
            dueReviews = wordReviewRepository.findByUserAndNextReviewBefore(user, Instant.now());
        }

        // 3. Sắp xếp theo Priority Score giảm dần
        return dueReviews.stream()
                .sorted(Comparator.comparingDouble(this::calculatePriorityScore).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private double calculatePriorityScore(WordReview review) {
        // 1. Overdue Score: Từ quá hạn càng lâu, điểm càng cao (tính bằng ngày)
        long daysOverdue = ChronoUnit.DAYS.between(review.getNextReview(), Instant.now());
        double overdueScore = Math.max(0, daysOverdue) * 2.0;

        // 2. Difficulty Score: Từ càng khó (difficulty cao), điểm càng cao
        // Difficulty trong FSRS từ 1 đến 10
        double difficultyScore = review.getDifficulty() * 1.5;

        // 3. Consecutive Wrong Penalty: Nếu làm sai liên tục hoặc chuỗi đúng thấp, ưu tiên nhắc lại
        double wrongWeight = (review.getConsecutiveCorrect() == 0) ? 5.0 : 0.0;
        
        // 4. Base Weight for low stability: Từ nào có stability thấp (nhanh quên) thì được cộng điểm
        double stabilityPenalty = Math.max(0, 10 - review.getStability());

        return overdueScore + difficultyScore + wrongWeight + stabilityPenalty;
    }
}

