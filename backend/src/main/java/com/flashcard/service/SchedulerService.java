package com.flashcard.service;

import com.flashcard.model.User;
import com.flashcard.model.WordReview;
import com.flashcard.repository.WordReviewRepository;
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
     * Lấy danh sách các từ cần ôn tập (Review Queue) dựa trên Priority Score.
     * Priority = OverdueScore + DifficultyScore + WrongWeight + ConsecutiveWrong
     */
    public List<WordReview> getReviewQueue(User user, int limit) {
        // 1. Lấy tất cả các từ đã đến hạn (nextReviewAt <= now)
        List<WordReview> dueReviews = wordReviewRepository.findByUserAndNextReviewBefore(user, Instant.now());

        // 2. Sắp xếp theo Priority Score giảm dần
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
