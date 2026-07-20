package com.flashcard.service;

import com.flashcard.model.ReviewRating;
import com.flashcard.model.WordReview;
import com.flashcard.model.WordReviewState;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class FsrsAlgorithm implements SpacedRepetitionAlgorithm {

    // Trọng số tiêu chuẩn của thuật toán FSRS (v4)
    private static final float[] w = {
            0.4f, 0.6f, 2.4f, 5.8f, 4.93f, 0.94f, 0.86f, 0.01f,
            1.49f, 0.14f, 0.94f, 2.18f, 0.05f, 0.34f, 1.26f, 0.29f, 2.61f
    };

    @Override
    public void calculateNextState(WordReview currentReview, ReviewRating rating) {
        WordReviewState currentState = currentReview.getState();
        
        if (currentState == WordReviewState.NEW) {
            initNewCard(currentReview, rating);
        } else {
            updateCard(currentReview, rating);
        }

        // Cập nhật thống kê
        currentReview.setReviewCount(currentReview.getReviewCount() + 1);
        
        if (rating == ReviewRating.AGAIN) {
            currentReview.setWrongCount(currentReview.getWrongCount() + 1);
            currentReview.setConsecutiveCorrect(0); // Reset chuỗi đúng
        } else {
            currentReview.setCorrectCount(currentReview.getCorrectCount() + 1);
            currentReview.setConsecutiveCorrect(currentReview.getConsecutiveCorrect() + 1);
        }

        // Tính ngày review tiếp theo
        currentReview.setNextReview(Instant.now().plus(currentReview.getIntervalDays(), ChronoUnit.DAYS));
        currentReview.setLastReviewedAt(Instant.now());
        currentReview.setLastRating(rating.getValue());
    }

    private void initNewCard(WordReview review, ReviewRating rating) {
        float difficulty = 0f;
        float stability = 0f;
        int interval = 0;

        switch (rating) {
            case AGAIN:
                difficulty = w[0];
                stability = w[4];
                interval = 1;
                review.setState(WordReviewState.LEARNING);
                break;
            case HARD:
                difficulty = w[1];
                stability = w[5];
                interval = 1;
                review.setState(WordReviewState.LEARNING);
                break;
            case GOOD:
                difficulty = w[2];
                stability = w[6];
                interval = 2; // Ngày đầu tiên
                review.setState(WordReviewState.LEARNING);
                break;
            case EASY:
                difficulty = w[3];
                stability = w[7];
                interval = 4;
                review.setState(WordReviewState.MATURE);
                break;
        }

        review.setDifficulty(Math.min(Math.max(difficulty, 1f), 10f));
        review.setStability(Math.max(stability, 0.1f));
        review.setIntervalDays(interval);
    }

    private void updateCard(WordReview review, ReviewRating rating) {
        float currentD = review.getDifficulty();
        float currentS = review.getStability();
        int currentInterval = review.getIntervalDays();
        
        float nextD = nextDifficulty(currentD, rating);
        float nextS = 0f;
        int nextInterval = 0;

        if (rating == ReviewRating.AGAIN) {
            // Memory lapse (Quên)
            nextS = nextForgetStability(currentD, currentS);
            nextInterval = 1; // Học lại ngay
            review.setState(WordReviewState.LEARNING);
        } else {
            // Nhớ (HARD, GOOD, EASY)
            nextS = nextRecallStability(currentD, currentS, rating);
            nextInterval = (int) Math.round(nextS);
            
            if (review.getState() != WordReviewState.MATURE && nextInterval >= 21) {
                review.setState(WordReviewState.MATURE);
            }
        }

        review.setDifficulty(nextD);
        review.setStability(nextS);
        review.setIntervalDays(nextInterval);
    }

    private float nextDifficulty(float d, ReviewRating rating) {
        float nextD = d - w[6] * (rating.getValue() - 3);
        return Math.min(Math.max(nextD, 1f), 10f);
    }

    private float nextRecallStability(float d, float s, ReviewRating rating) {
        float hardPenalty = (rating == ReviewRating.HARD) ? w[15] : 1f;
        float easyBonus = (rating == ReviewRating.EASY) ? w[16] : 1f;
        
        float nextS = s * (1 + (float) Math.exp(w[8]) * (11 - d) * 
                      (float) Math.pow(s, -w[9]) * 
                      ((float) Math.exp(w[10] * 1) - 1) * hardPenalty * easyBonus);
                      
        return Math.min(Math.max(nextS, 0.1f), 36500f);
    }

    private float nextForgetStability(float d, float s) {
        float nextS = w[11] * (float) Math.pow(d, -w[12]) * 
                      (float) Math.pow(s, w[13]) * 
                      (float) Math.exp(w[14] * 1);
        return Math.min(Math.max(nextS, 0.1f), 36500f);
    }
}
