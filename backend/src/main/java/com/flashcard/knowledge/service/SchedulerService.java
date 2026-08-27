package com.flashcard.knowledge.service;

import com.flashcard.user.model.User;
import com.flashcard.srs.model.WordReview;
import com.flashcard.srs.model.WordReviewState;
import com.flashcard.srs.provider.SrsDataProvider;
import com.flashcard.vocabulary.model.Vocabulary;
import com.flashcard.vocabulary.provider.VocabularyDataProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SchedulerService {

    private final SrsDataProvider srsDataProvider;
    private final VocabularyDataProvider vocabularyDataProvider;

    public SchedulerService(SrsDataProvider srsDataProvider,
                            VocabularyDataProvider vocabularyDataProvider) {
        this.srsDataProvider = srsDataProvider;
        this.vocabularyDataProvider = vocabularyDataProvider;
    }

    /**
     * Lấy danh sách các từ cần ôn tập (Morning Review Queue) theo thứ tự SRS.
     * Cứ lấy từ trong các từ phải ôn theo thứ tự SRS ra (nextReview tăng dần: từ quá hạn / đến hạn trước thì ôn trước).
     */
    public List<WordReview> getReviewQueue(User user, int limit) {
        if (user == null) return Collections.emptyList();

        java.time.ZoneId zone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        java.time.ZonedDateTime nowZoned = java.time.ZonedDateTime.now(zone);
        
        // 1. Ngưỡng đến hạn: Hết ngày hôm nay theo giờ Việt Nam
        java.time.Instant dueThreshold = nowZoned.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();

        // 2. Khoảng thời gian ngày hôm qua (để bắt thêm các từ vừa học hôm qua cần củng cố)
        java.time.ZonedDateTime yesterdayStart = nowZoned.minusDays(1).toLocalDate().atStartOfDay(zone);
        java.time.Instant yStart = yesterdayStart.toInstant();
        java.time.Instant yEnd = yesterdayStart.plusDays(1).toInstant();

        // Lấy danh sách các từ đến hạn theo Morning Review Queue (hoặc due reviews)
        List<WordReview> dueReviews = srsDataProvider.findMorningReviewQueue(user, dueThreshold, yStart, yEnd);
        if (dueReviews == null || dueReviews.isEmpty()) {
            dueReviews = srsDataProvider.findDueWordReviews(user, dueThreshold);
        }
        if (dueReviews == null || dueReviews.isEmpty()) {
            dueReviews = srsDataProvider.findDueWordReviews(user, Instant.now());
        }

        List<WordReview> resultList = new ArrayList<>();
        Set<Long> seenVocabIds = new HashSet<>();

        // Sắp xếp các từ phải ôn theo thứ tự SRS (nextReview tăng dần: từ nào đến hạn / quá hạn trước thì ôn trước)
        if (dueReviews != null) {
            List<WordReview> validReviews = dueReviews.stream()
                    .filter(wr -> wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null)
                    .sorted(Comparator.comparing(
                            wr -> wr.getNextReview() != null ? wr.getNextReview() : Instant.EPOCH
                    ))
                    .collect(Collectors.toList());

            for (WordReview wr : validReviews) {
                if (seenVocabIds.add(wr.getVocabulary().getId())) {
                    resultList.add(wr);
                    if (resultList.size() >= limit) break;
                }
            }
        }

        // 3. Nếu danh sách chưa đủ limit (hoặc user đã ôn hết từ quá hạn), bổ sung từ sắp đến hạn tiếp theo
        if (resultList.size() < limit) {
            List<WordReview> allLearned = srsDataProvider.findAllLearnedByUser(user);
            if (allLearned != null) {
                // Sắp xếp các từ đã học theo nextReview ASC để ôn cuốn chiếu
                allLearned.stream()
                        .filter(wr -> wr != null && wr.getVocabulary() != null && wr.getVocabulary().getId() != null)
                        .sorted(Comparator.comparing(
                                wr -> wr.getNextReview() != null ? wr.getNextReview() : Instant.EPOCH
                        ))
                        .forEach(wr -> {
                            if (resultList.size() < limit && seenVocabIds.add(wr.getVocabulary().getId())) {
                                resultList.add(wr);
                            }
                        });
            }
        }

        // 4. Fallback cuối cùng: Chỉ dành cho user hoàn toàn mới (0 từ trong SRS)
        if (resultList.isEmpty()) {
            int needed = limit;
            List<Vocabulary> extraVocabs = vocabularyDataProvider.getRandom(needed);
            if (extraVocabs == null || extraVocabs.isEmpty()) {
                extraVocabs = vocabularyDataProvider.getRandomByLevel("N5", needed);
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

        return resultList;
    }
}

