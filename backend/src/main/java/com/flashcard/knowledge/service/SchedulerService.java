package com.flashcard.knowledge.service;

import com.flashcard.user.model.User;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.repository.WordReviewRepository;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    @Autowired
    private WordReviewRepository wordReviewRepository;

    @Autowired
    private VocabularyDataProvider vocabularyDataProvider;

    /**
     * Lấy danh sách các từ cần ôn tập (Morning Review Queue) dựa trên Priority Score.
     * Bao gồm tất cả từ quá hạn, từ đến hạn hôm nay, từ vừa mới học/ôn ngày hôm qua,
     * và tự động fallback sang từ đã học hoặc từ vựng theo trình độ nếu chưa có từ quá hạn.
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

        List<WordReview> dueReviews = null;
        if (user != null) {
            dueReviews = wordReviewRepository.findMorningReviewQueue(user, dueThreshold, yStart, yEnd);
            if (dueReviews == null || dueReviews.isEmpty()) {
                dueReviews = wordReviewRepository.findByUserAndNextReviewBefore(user, Instant.now());
            }
            if (dueReviews == null || dueReviews.isEmpty()) {
                dueReviews = wordReviewRepository.findAllByUserFetchVocabulary(user);
            }
        }

        List<WordReview> resultList = new ArrayList<>();
        Set<Long> seenVocabIds = new java.util.HashSet<>();

        if (dueReviews != null) {
            for (WordReview wr : dueReviews) {
                if (wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null) {
                    if (seenVocabIds.add(wr.getVocabulary().getId())) {
                        resultList.add(wr);
                    }
                }
            }
        }

        // 3. Fallback: Nếu danh sách rỗng hoặc ít hơn limit, bổ sung từ vựng từ hệ thống
        if (resultList.size() < limit) {
            int needed = limit - resultList.size();
            List<Vocabulary> extraVocabs = vocabularyDataProvider.getRandom(needed * 2);
            if (extraVocabs == null || extraVocabs.isEmpty()) {
                extraVocabs = vocabularyDataProvider.getRandomByLevel("N5", needed * 2);
            }

            if (extraVocabs != null) {
                for (Vocabulary v : extraVocabs) {
                    if (v != null && v.getId() != null && seenVocabIds.add(v.getId())) {
                        WordReview fakeReview = new WordReview(user, v);
                        fakeReview.setState(WordReviewState.NEW);
                        fakeReview.setDifficulty(4.93f);
                        fakeReview.setStability(0.4f);
                        fakeReview.setIntervalDays(0);
                        fakeReview.setNextReview(Instant.now());
                        resultList.add(fakeReview);
                        if (resultList.size() >= limit) break;
                    }
                }
            }
        }

        // 4. Sắp xếp theo Priority Score giảm dần
        return resultList.stream()
                .sorted(Comparator.comparingDouble(this::calculatePriorityScore).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private double calculatePriorityScore(WordReview review) {
        if (review == null) return 0.0;
        Instant nextRev = review.getNextReview() != null ? review.getNextReview() : Instant.now();

        // 1. Overdue Score: Từ quá hạn càng lâu, điểm càng cao (tính bằng ngày)
        long daysOverdue = ChronoUnit.DAYS.between(nextRev, Instant.now());
        double overdueScore = Math.max(0, daysOverdue) * 2.0;

        // 2. Difficulty Score: Từ càng khó (difficulty cao), điểm càng cao
        double difficultyScore = review.getDifficulty() * 1.5;

        // 3. Consecutive Wrong Penalty: Nếu làm sai liên tục hoặc chuỗi đúng thấp, ưu tiên nhắc lại
        double wrongWeight = (review.getConsecutiveCorrect() == 0) ? 5.0 : 0.0;
        
        // 4. Base Weight for low stability: Từ nào có stability thấp (nhanh quên) thì được cộng điểm
        double stabilityPenalty = Math.max(0, 10 - review.getStability());

        return overdueScore + difficultyScore + wrongWeight + stabilityPenalty;
    }
}

